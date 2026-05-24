import { Request, Response } from 'express';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { JWT_SECRET, NODE_ENV } from '../config/env';
import { decryptTossData } from '../utils/tossDecrypt';
// Initialize mTLS HTTPS Agent
let httpsAgent: https.Agent | null = null;
try {
  const certPath = path.resolve(process.cwd(), 'src/config/certs/03.v_public.crt');
  const keyPath = path.resolve(process.cwd(), 'src/config/certs/03.v_private.key');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    });
    console.log('✅ Toss mTLS HTTPS Agent initialized successfully.');
  } else {
    console.warn('⚠️ Toss mTLS certificates not found in src/config/certs. Toss Login will fail.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Toss mTLS Agent:', error);
}

// Toss API 클라이언트를 lazy 초기화 (env vars 확실히 로드된 후 생성)
let _tossApiClient: AxiosInstance | null = null;
function getTossApiClient(): AxiosInstance {
  if (!_tossApiClient) {
    const clientId = process.env.TOSS_CLIENT_ID;
    const secretKey = process.env.TOSS_SECRET_KEY;
    console.log('Toss API Client init - CLIENT_ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET');
    _tossApiClient = axios.create({
      baseURL: 'https://apps-in-toss-api.toss.im',
      httpsAgent: httpsAgent || undefined,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${secretKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }
  return _tossApiClient;
}

export const loginWithToss = async (req: Request, res: Response) => {
  try {
    const { authorizationCode, selectedRole } = req.body;
    if (!authorizationCode) {
      return res.status(400).json({ error: 'authorizationCode is required' });
    }
    if (!selectedRole || !['TENANT', 'LANDLORD'].includes(selectedRole)) {
      return res.status(400).json({ error: 'selectedRole must be TENANT or LANDLORD' });
    }

    if (!httpsAgent) {
      return res.status(500).json({ error: 'Server misconfiguration: Toss mTLS Agent is not ready.' });
    }

    // 1. 인가 코드로 엑세스 토큰 발급
    console.log('Toss Token Request - sending to generate-token with code length:', authorizationCode?.length);
    const tokenResponse = await getTossApiClient().post('/api-partner/v1/apps-in-toss/user/oauth2/generate-token', {
      authorizationCode: authorizationCode,
      referrer: req.body.referrer || 'DEFAULT'
    });

    console.log('Toss Token Response Data:', JSON.stringify(tokenResponse.data, null, 2));

    const accessToken = tokenResponse.data?.success?.accessToken || tokenResponse.data?.accessToken;

    if (!accessToken) {
      throw new Error(`Failed to retrieve access token from Toss. Response: ${JSON.stringify(tokenResponse.data)}`);
    }

    // 2. 엑세스 토큰으로 유저 정보 조회
    const userResponse = await getTossApiClient().get('/api-partner/v1/apps-in-toss/user/oauth2/login-me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const tossUser = userResponse.data?.success || userResponse.data;
    console.log('Toss User Info Response:', JSON.stringify(tossUser, null, 2));

    // JWT의 sub 클레임에서 user_key 추출 (암호화 없이 항상 제공됨)
    let userKey = tossUser.userKey || tossUser.user_key;
    if (!userKey) {
      // accessToken JWT를 디코드하여 sub(유저 고유키) 추출
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        userKey = payload.sub;
        console.log('Toss Login - Extracted user_key from JWT sub:', userKey);
      } catch (e) {
        console.error('Failed to decode JWT:', e);
      }
    }

    // userKey를 반드시 문자열로 변환 (숫자로 올 수 있음)
    const userKeyStr = String(userKey);

    if (!userKeyStr) {
      return res.status(400).json({ error: '토스에서 유저 식별 정보를 가져오지 못했습니다.' });
    }

    // 3. 기존 DB에서 유저 찾기 (toss_유저키 기준)
    const targetUsername = 'toss_' + userKeyStr;
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: targetUsername }
        ]
      }
    });

    // 4. Role 추가 여부 확인
    const currentRoles: string[] = user ? ((user as any).roles || []) : [];
    const needsRoleAddition = user && !currentRoles.includes(selectedRole);

    // 4-A. 신규 유저이거나, 기존 유저인데 새로운 Role을 추가하려는 경우 → 추가 정보 필요
    if (!user || needsRoleAddition) {
      const { inviteCode, phone } = req.body;

      if (selectedRole === 'TENANT' && !inviteCode) {
        // 임시 토큰 발급 (10분 유효) — 추가 정보 입력 후 가입 완료 시 사용
        const tempToken = jwt.sign(
          { userKey: userKeyStr, name: tossUser.name, selectedRole },
          JWT_SECRET,
          { expiresIn: '10m' }
        );
        return res.json({
          success: false,
          needsRegistration: true,
          requiredField: 'inviteCode',
          message: '임대인의 초대코드를 입력해 주세요.',
          tempToken
        });
      }

      if (selectedRole === 'LANDLORD' && !phone) {
        const tempToken = jwt.sign(
          { userKey: userKeyStr, name: tossUser.name, selectedRole },
          JWT_SECRET,
          { expiresIn: '10m' }
        );
        return res.json({
          success: false,
          needsRegistration: true,
          requiredField: 'phone',
          message: '전화번호를 입력해 주세요.',
          tempToken
        });
      }

      // 추가 정보가 함께 온 경우 → 검증 후 계정 생성/업데이트
      let resolvedRoomId: string | null = null;
      let resolvedLandlordId: string | null = null;
      let resolvedTenantId: string | null = null;

      if (selectedRole === 'TENANT') {
        const invitation = await prisma.invitation.findUnique({ where: { code: inviteCode } });
        if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
          return res.status(400).json({ error: '유효하지 않거나 이미 사용된 초대코드입니다.' });
        }
        resolvedLandlordId = invitation.landlordId || null;
        resolvedTenantId = invitation.tenantId || null;
        if (invitation.tenantId) {
          const physicalTenant = await prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
          if (physicalTenant?.roomId) resolvedRoomId = physicalTenant.roomId;
        }
      }

      let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
      if (selectedRole === 'LANDLORD') {
        if (!cleanPhone || cleanPhone.length < 10) {
          return res.status(400).json({ error: '유효한 전화번호를 입력해 주세요.' });
        }
      }

      const realName = decryptTossData(tossUser.name) || '토스유저';

      if (!user) {
        // 완전 신규 유저 생성
        const dummyPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(dummyPassword, 10);
        const dummyEmail = `toss_${userKeyStr}@toss.login`;

        user = await prisma.user.create({
          data: {
            username: targetUsername,
            name: realName,
            phone: selectedRole === 'LANDLORD' ? cleanPhone : '',
            email: dummyEmail,
            password: hashedPassword,
            plainPassword: dummyPassword,
            roles: [selectedRole],
            status: 'ACTIVE',
            landlordId: resolvedLandlordId,
            roomId: resolvedRoomId
          }
        });
        console.log(`✅ Toss Login: New user registered (${targetUsername}) with role [${selectedRole}]`);
      } else {
        // 기존 유저에 Role 및 매핑 정보 추가
        const updatedData: any = {
          roles: [...currentRoles, selectedRole],
          name: realName
        };
        if (selectedRole === 'LANDLORD') updatedData.phone = cleanPhone;
        if (selectedRole === 'TENANT') {
          updatedData.landlordId = resolvedLandlordId;
          updatedData.roomId = resolvedRoomId;
        }

        user = await prisma.user.update({
          where: { id: user.id },
          data: updatedData
        });
        console.log(`✅ Toss Login: Role [${selectedRole}] added to existing user (${user.username})`);
      }

      // 임차인인 경우 초대코드 사용 처리 및 물리 테넌트 매핑 (신규/기존 동일)
      if (selectedRole === 'TENANT' && inviteCode) {
        const invitation = await prisma.invitation.findUnique({ where: { code: inviteCode } });
        if (invitation) {
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: { isUsed: true, usedBy: user.id }
          });
          if (resolvedTenantId) {
            await prisma.tenant.update({
              where: { id: resolvedTenantId },
              data: { loginUserId: user!.id }
            }).catch(err => console.log('Failed to map tenant info:', err));
          }
        }
      }

    } else {
      // 4-B. 기존 유저가 이미 해당 Role을 가진 경우 → 정보만 업데이트
      const realName = decryptTossData(tossUser.name) || '토스유저';
      if (user.name !== realName) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: realName }
        });
      }
      console.log(`✅ Toss Login: Existing user (${user.username}) logged in as [${selectedRole}]`);
    }

    // 5. JWT 토큰 발급 — roles(전체 권한 배열) + currentRole(현재 접속 역할) 분리
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: (user as any).roles,
        currentRole: selectedRole,
        status: user.status
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        roles: (user as any).roles,
        currentRole: selectedRole,
        status: user.status
      }
    });

  } catch (error: any) {
    const clientId = process.env.TOSS_CLIENT_ID;
    console.error('Toss Login Error (Full):', JSON.stringify(error.response?.data, null, 2) || error.message);
    console.error('Toss Login - Request URL:', error.config?.url);
    console.error('Toss Login - TOSS_CLIENT_ID loaded:', clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET');
    res.status(500).json({ error: '토스 로그인 처리 중 서버 오류가 발생했습니다.', details: error.response?.data });
  }
};

/**
 * 토스 최초 로그인 시 추가 정보 입력 후 가입 완료
 * POST /api/auth/toss/complete-registration
 * body: { tempToken, inviteCode?, phone?, selectedRole }
 */
export const completeTossRegistration = async (req: Request, res: Response) => {
  try {
    const { tempToken, inviteCode, phone, selectedRole } = req.body;

    if (!tempToken) {
      return res.status(400).json({ error: '임시 토큰이 필요합니다.' });
    }

    // 임시 토큰 검증
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: '인증이 만료되었습니다. 다시 로그인해 주세요.' });
    }

    const userKeyStr = decoded.userKey;
    const role = selectedRole || decoded.selectedRole;

    if (!userKeyStr || !role) {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const targetUsername = 'toss_' + userKeyStr;
    const existingUser = await prisma.user.findFirst({ where: { username: targetUsername } });

    // 필수 필드 검증
    let resolvedRoomId: string | null = null;
    let resolvedLandlordId: string | null = null;
    let resolvedTenantId: string | null = null;

    if (role === 'TENANT') {
      if (!inviteCode) return res.status(400).json({ error: '초대코드를 입력해 주세요.' });
      const invitation = await prisma.invitation.findUnique({ where: { code: inviteCode } });
      if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: '유효하지 않거나 이미 사용된 초대코드입니다.' });
      }
      resolvedLandlordId = invitation.landlordId || null;
      resolvedTenantId = invitation.tenantId || null;
      if (invitation.tenantId) {
        const physicalTenant = await prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
        if (physicalTenant?.roomId) resolvedRoomId = physicalTenant.roomId;
      }
    }

    let cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    if (role === 'LANDLORD') {
      if (!cleanPhone || cleanPhone.length < 10) return res.status(400).json({ error: '유효한 전화번호를 입력해 주세요.' });
    }

    let user;

    if (existingUser) {
      // 기존 유저에 새로운 Role 추가 및 정보 업데이트
      const currentRoles: string[] = (existingUser as any).roles || [];
      const updatedData: any = {};
      
      if (!currentRoles.includes(role)) {
        updatedData.roles = [...currentRoles, role];
      }
      if (decoded.name) updatedData.name = decoded.name;
      if (role === 'LANDLORD') updatedData.phone = cleanPhone;
      if (role === 'TENANT') {
        updatedData.landlordId = resolvedLandlordId;
        updatedData.roomId = resolvedRoomId;
      }

      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: Object.keys(updatedData).length > 0 ? updatedData : undefined
      });
      console.log(`✅ Toss Registration: Updated existing user (${targetUsername}) with role [${role}]`);
    } else {
      // 신규 유저 생성
      const dummyPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(dummyPassword, 10);
      const dummyEmail = `toss_${userKeyStr}@toss.login`;

      user = await prisma.user.create({
        data: {
          username: targetUsername,
          name: decoded.name || '토스유저',
          phone: role === 'LANDLORD' ? cleanPhone : '',
          email: dummyEmail,
          password: hashedPassword,
          plainPassword: dummyPassword,
          roles: [role],
          status: 'ACTIVE',
          landlordId: resolvedLandlordId,
          roomId: resolvedRoomId
        }
      });
      console.log(`✅ Toss Registration Complete: New user (${targetUsername}) with role [${role}]`);
    }

    // 초대코드 사용 처리 (신규/기존 동일)
    if (role === 'TENANT' && inviteCode) {
      const invitation = await prisma.invitation.findUnique({ where: { code: inviteCode } });
      if (invitation) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { isUsed: true, usedBy: user.id }
        });
        if (resolvedTenantId) {
          await prisma.tenant.update({
            where: { id: resolvedTenantId },
            data: { loginUserId: user.id }
          }).catch(err => console.log('Failed to map tenant info:', err));
        }
      }
    }

    console.log(`✅ Toss Registration Complete: (${targetUsername}) with role [${role}]`);

    // JWT 발급
    const token = jwt.sign(
      { id: user.id, username: user.username, roles: [role], currentRole: role, status: 'ACTIVE' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, roles: [role], currentRole: role, status: 'ACTIVE' }
    });

  } catch (error: any) {
    console.error('Toss Registration Error:', error.message);
    res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' });
  }
};

export const handleTossCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error: tossError } = req.query;

    if (tossError) {
      console.error('Toss Web OAuth Error:', tossError);
      return res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'TOSS_LOGIN_ERROR', error: '토스 로그인 인증에 실패했습니다.' }, '*');
            window.close();
          } else {
            window.location.href = '/?error=' + encodeURIComponent('토스 로그인 인증에 실패했습니다.');
          }
        </script>
      `);
    }

    if (!code) {
      return res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'TOSS_LOGIN_ERROR', error: '토스 인증 코드가 누락되었습니다.' }, '*');
            window.close();
          } else {
            window.location.href = '/?error=' + encodeURIComponent('토스 인증 코드가 누락되었습니다.');
          }
        </script>
      `);
    }

    const selectedRole = typeof state === 'string' ? state : 'TENANT';

    if (!httpsAgent) {
      return res.status(500).json({ error: 'Server misconfiguration: Toss mTLS Agent is not ready.' });
    }

    // 1. 인가 코드로 엑세스 토큰 발급
    const tokenResponse = await getTossApiClient().post('/api-partner/v1/apps-in-toss/user/oauth2/generate-token', {
      authorizationCode: code as string,
      referrer: 'DEFAULT'
    });

    const accessToken = tokenResponse.data?.success?.accessToken || tokenResponse.data?.accessToken;

    if (!accessToken) {
      throw new Error(`Failed to retrieve access token from Toss. Response: ${JSON.stringify(tokenResponse.data)}`);
    }

    // 2. 엑세스 토큰으로 유저 정보 조회
    const userResponse = await getTossApiClient().get('/api-partner/v1/apps-in-toss/user/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const tossUser = userResponse.data?.success || userResponse.data;
    const cleanPhone = tossUser.phoneNumber?.replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      return res.send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'TOSS_LOGIN_ERROR', error: '토스에서 전화번호 정보를 가져오지 못했습니다.' }, '*');
            window.close();
          } else {
            window.location.href = '/?error=' + encodeURIComponent('토스에서 전화번호 정보를 가져오지 못했습니다.');
          }
        </script>
      `);
    }

    // 3. 기존 DB에서 유저 찾기 (전화번호 기준)
    const targetUsername = 'toss_' + cleanPhone;
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: targetUsername },
          { phone: cleanPhone }
        ]
      }
    });

    // 4-A. 신규 유저 → 계정 생성 + selectedRole 부여
    if (!user) {
      const dummyPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(dummyPassword, 10);
      const dummyEmail = `toss_${cleanPhone}@toss.login`;

      user = await prisma.user.create({
        data: {
          username: targetUsername,
          name: tossUser.name || '토스유저',
          phone: cleanPhone,
          email: dummyEmail,
          password: hashedPassword,
          plainPassword: dummyPassword,
          roles: [selectedRole],
          status: 'ACTIVE'
        }
      });
      console.log(`✅ Toss Web Login: New user registered (${targetUsername}) with role [${selectedRole}]`);

    } else {
      // 4-B. 기존 유저 → roles 배열에 selectedRole이 없으면 추가
      const currentRoles: string[] = (user as any).roles || [];
      if (!currentRoles.includes(selectedRole)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: [...currentRoles, selectedRole] }
        });
        console.log(`✅ Toss Web Login: Role [${selectedRole}] added to existing user (${user.username})`);
        (user as any).roles = [...currentRoles, selectedRole];
      } else {
        console.log(`✅ Toss Web Login: Existing user (${user.username}) logged in as [${selectedRole}]`);
      }
    }

    // Check subscription access for Web Landlords
    if (selectedRole === 'LANDLORD') {
      const isSuperAdmin = user.username === 'wjsdudtns' || (user as any).roles?.includes('ADMIN');
      if (!isSuperAdmin && !user.isSubscribed) {
        return res.send(`
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'TOSS_LOGIN_ERROR', error: 'PC 웹 버전은 프리미엄 구독자 전용입니다. 토스 앱에서 먼저 구독해 주세요.' }, '*');
              window.close();
            } else {
              window.location.href = '/?error=' + encodeURIComponent('PC 웹 버전은 프리미엄 구독자 전용입니다. 토스 앱에서 먼저 구독해 주세요.');
            }
          </script>
        `);
      }
    }

    // 5. JWT 토큰 발급
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: (user as any).roles,
        currentRole: selectedRole,
        status: user.status
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 6. 리다이렉트
    const dest = selectedRole === 'TENANT' ? '/payment' : '/dashboard';
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'TOSS_LOGIN_SUCCESS', dest: '${dest}' }, '*');
          window.close();
        } else {
          window.location.href = '${dest}';
        }
      </script>
    `);

  } catch (error: any) {
    console.error('Toss Web Callback Error:', error.response?.data || error.message);
    return res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'TOSS_LOGIN_ERROR', error: '토스 로그인 처리 중 서버 오류가 발생했습니다.' }, '*');
          window.close();
        } else {
          window.location.href = '/?error=' + encodeURIComponent('토스 로그인 처리 중 서버 오류가 발생했습니다.');
        }
      </script>
    `);
  }
};

export const unlinkToss = async (req: Request, res: Response) => {
  // 토스 앱에서 "연결 끊기" 클릭 시 호출되는 웹훅 (Basic Auth 검증 필요)
  try {
    const { userKey, accessToken } = req.body;
    console.log(`Toss Unlink Request received for userKey: ${userKey}`);

    // 필요하다면 여기서 DB 토큰 무효화 혹은 세션 제거 로직 실행

    return res.json({ success: true, message: 'Unlinked successfully' });
  } catch (error: any) {
    console.error('Toss Unlink Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
