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
exports.NotificationService = void 0;
const NotificationTemplate_1 = require("../domain/NotificationTemplate");
class NotificationService {
    constructor(primaryProvider, fallbackProvider, logger) {
        this.primaryProvider = primaryProvider;
        this.fallbackProvider = fallbackProvider;
        this.logger = logger;
    }
    /**
     * Sends a notification using the primary provider (Kakao).
     * If it fails, falls back to the secondary provider (SMS).
     * Logs all attempts and their statuses.
     */
    sendNotification(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { to, tenantId, useCase, data, isManual = false } = options;
            const messageContent = (0, NotificationTemplate_1.compileTemplate)(useCase, data);
            // Initial log entry (Pending)
            const logEntry = yield this.logger.log({
                tenantId,
                useCase,
                channel: 'UNKNOWN', // Will update later
                status: 'PENDING',
                sentAt: null,
                isManual,
                content: messageContent,
            });
            try {
                // Attempt 1: Primary Channel (Kakao AlimTalk)
                const primaryResult = yield this.primaryProvider.send(to, messageContent, useCase);
                if (primaryResult.success) {
                    yield this.logger.updateStatus(logEntry.id, 'SENT', 'KAKAO_ALIMTALK');
                    return true;
                }
                // If Kakao returns false (e.g., user not on Kakao), log and fallback
                console.warn(`[NotificationService] Kakao failed for ${to}. Reason: ${primaryResult.error}. Falling back to SMS.`);
            }
            catch (error) {
                console.warn(`[NotificationService] Kakao threw an error for ${to}. Error: ${error.message}. Falling back to SMS.`);
            }
            // Attempt 2: Fallback Channel (SMS)
            try {
                const fallbackResult = yield this.fallbackProvider.send(to, messageContent, useCase);
                if (fallbackResult.success) {
                    yield this.logger.updateStatus(logEntry.id, 'SENT', 'SMS', 'Sent via SMS fallback after Kakao failed');
                    return true;
                }
                // If SMS also fails, we've failed entirely
                yield this.logger.updateStatus(logEntry.id, 'FAILED', 'SMS', `All channels failed. Final error: ${fallbackResult.error}`);
                return false;
            }
            catch (error) {
                yield this.logger.updateStatus(logEntry.id, 'FAILED', 'UNKNOWN', `All channels failed with exceptions. Final Error: ${error.message}`);
                return false;
            }
        });
    }
}
exports.NotificationService = NotificationService;
