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
exports.SMSProvider = void 0;
class SMSProvider {
    constructor() {
        this.channelName = 'SMS';
    }
    send(to, message, useCase) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[SMSProvider] Preparing to send to ${to}...`);
            try {
                // MOCK API CALL
                // const response = await axios.post('https://api.smsprovider.example', { to, text: message });
                console.log(`[SMSProvider] Successfully sent SMS to ${to}. Message preview: "${message.substring(0, 20)}..."`);
                return {
                    success: true,
                    messageId: `sms_${Date.now()}`
                };
            }
            catch (error) {
                console.error(`[SMSProvider] Error: ${error.message}`);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
}
exports.SMSProvider = SMSProvider;
