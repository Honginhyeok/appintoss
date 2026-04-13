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
exports.InMemoryLogger = void 0;
class InMemoryLogger {
    constructor() {
        this.logs = [];
    }
    log(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const newLog = Object.assign(Object.assign({}, entry), { id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}` });
            this.logs.push(newLog);
            return newLog;
        });
    }
    updateStatus(id, status, channel, failureReason) {
        return __awaiter(this, void 0, void 0, function* () {
            const logIndex = this.logs.findIndex((l) => l.id === id);
            if (logIndex !== -1) {
                if (channel)
                    this.logs[logIndex].channel = channel;
                this.logs[logIndex].status = status;
                if (status === 'SENT') {
                    this.logs[logIndex].sentAt = new Date();
                }
                if (failureReason) {
                    this.logs[logIndex].failureReason = failureReason;
                }
            }
        });
    }
    getLogs() {
        return this.logs;
    }
}
exports.InMemoryLogger = InMemoryLogger;
