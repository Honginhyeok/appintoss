import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import tenantRoutes from './routes/tenantRoutes';
import transactionRoutes from './routes/transactionRoutes';
import summaryRoutes from './routes/summaryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import invitationRoutes from './routes/invitationRoutes';
import boardRoutes from './routes/boardRoutes';
import webpushRoutes from './routes/webpushRoutes';
import paymentRoutes from './routes/paymentRoutes';
import bellNotificationRoutes from './routes/bellNotificationRoutes';
import inAppNotificationRoutes from './routes/inAppNotificationRoutes';
import communityBoardRoutes from './routes/communityBoardRoutes';
import tossAuthRoutes from './routes/tossAuthRoutes';
import briefingRoutes from './routes/briefingRoutes';

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // CSS/JS scripts are loaded from various sources so CSP is disabled for now
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Set up routes
app.use('/api/auth/toss', tossAuthRoutes);
app.use('/api/toss', tossAuthRoutes); // 토스 공식 등록 redirect_uri (/api/toss/callback) 연동 매핑용 추가
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api', notificationRoutes); // Handles /api/logs and /api/notify
app.use('/api/invitations', invitationRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/webpush', webpushRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bell-notifications', bellNotificationRoutes);
app.use('/api/in-app-notifications', inAppNotificationRoutes);
app.use('/api/community-board', communityBoardRoutes);
app.use('/api/host/daily-briefing', briefingRoutes);

export default app;
