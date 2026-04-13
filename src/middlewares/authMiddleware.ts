import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;
  if (!token && typeof req.headers.authorization === 'string') {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });

    try {
      // JWT 서명이 유효해도 DB에 실제로 존재하는 유저인지 확인
      // (DB 초기화, 재배포 후 오래된 쿠키로 인한 FK 오류 방지)
      const userInDb = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!userInDb) {
        // 유저가 DB에 없으면 쿠키 삭제 후 401 반환 → 프론트엔드가 로그인 화면으로 이동
        res.clearCookie('token');
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      // 비활성화된 계정 차단 (초대코드 삭제 → 퇴실 처리)
      if (userInDb.isActive === false) {
        res.clearCookie('token');
        return res.status(403).json({ error: '임대인에 의해 접근이 제한된 계정입니다. (퇴실 처리됨)' });
      }

      req.user = decoded;
      next();
    } catch (e: any) {
      return res.status(500).json({ error: 'Auth check failed: ' + e.message });
    }
  });
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Require Admin role' });
  next();
};
