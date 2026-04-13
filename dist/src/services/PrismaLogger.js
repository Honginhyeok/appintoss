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
exports.PrismaLogger = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PrismaLogger {
    log(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const createdLog = yield prisma.notificationLog.create({
                data: {
                    tenantId: entry.tenantId,
                    useCase: entry.useCase,
                    channel: entry.channel,
                    status: entry.status,
                    sentAt: entry.sentAt,
                    isManual: entry.isManual,
                    content: entry.content,
                },
            });
            return Object.assign(Object.assign({}, createdLog), { channel: createdLog.channel, status: createdLog.status, failureReason: (_a = createdLog.failureReason) !== null && _a !== void 0 ? _a : undefined });
        });
    }
    updateStatus(id, status, channel, failureReason) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = {
                status,
            };
            if (channel)
                updateData.channel = channel;
            if (failureReason)
                updateData.failureReason = failureReason;
            if (status === 'SENT') {
                updateData.sentAt = new Date();
            }
            yield prisma.notificationLog.update({
                where: { id },
                data: updateData,
            });
        });
    }
    // Not part of the interface, but helpful to see logs
    getLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            const logs = yield prisma.notificationLog.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return logs.map((log) => {
                var _a;
                return (Object.assign(Object.assign({}, log), { channel: log.channel, status: log.status, failureReason: (_a = log.failureReason) !== null && _a !== void 0 ? _a : undefined }));
            });
        });
    }
}
exports.PrismaLogger = PrismaLogger;
