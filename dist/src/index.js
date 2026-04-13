"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const NotificationService_1 = require("./services/NotificationService");
const KakaoAlimTalkProvider_1 = require("./providers/KakaoAlimTalkProvider");
const SMSProvider_1 = require("./providers/SMSProvider");
const PrismaLogger_1 = require("./services/PrismaLogger");
const NotificationTemplate_1 = require("./domain/NotificationTemplate");
function runDemo() {
    return __awaiter(this, void 0, void 0, function* () {
        const kakao = new KakaoAlimTalkProvider_1.KakaoAlimTalkProvider();
        const sms = new SMSProvider_1.SMSProvider();
        const logger = new PrismaLogger_1.PrismaLogger();
        const service = new NotificationService_1.NotificationService(kakao, sms, logger);
        console.log("--- Sending Rent Due Notification ---");
        yield service.sendNotification({
            to: '010-1234-5678',
            tenantId: 'tenant_1',
            useCase: NotificationTemplate_1.NotificationUseCase.RENT_DUE,
            data: {
                tenantName: '홍길동',
                amount: '500,000',
                dueDate: '2026-05-01'
            },
            isManual: false,
        });
        console.log("\n--- Sending Maintenance Completed (Manual) ---");
        yield service.sendNotification({
            to: '010-9876-5432',
            tenantId: 'tenant_2',
            useCase: NotificationTemplate_1.NotificationUseCase.MAINTENANCE_COMPLETED,
            data: {},
            isManual: true, // Triggered manually by Admin
        });
        console.log("\n--- Dumping Notification Logs ---");
        const logs = yield logger.getLogs();
        console.log(JSON.stringify(logs, null, 2));
    });
}
runDemo().catch(console.error);
