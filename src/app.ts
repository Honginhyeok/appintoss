import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

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

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Set up routes
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

export default app;
