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
exports.KakaoAlimTalkProvider = void 0;
class KakaoAlimTalkProvider {
    constructor() {
        this.channelName = 'KAKAO_ALIMTALK';
        // Config mapping from our use case to Kakao's registered template ID
        this.templateIdMap = {
            'RENT_DUE': 'kakao_tpl_rent_due_01',
            'OVERDUE_PAYMENT': 'kakao_tpl_overdue_01',
            'CONTRACT_ENDING': 'kakao_tpl_contract_01',
            'MAINTENANCE_REQUEST_RECEIVED': 'kakao_tpl_maint_recv_01',
            'MAINTENANCE_COMPLETED': 'kakao_tpl_maint_comp_01',
        };
    }
    send(to, message, useCase) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[KakaoProvider] Preparing to send to ${to}...`);
            // In a real integration, useCase would map to Kakao's registered template ID 
            // and we would call the provider's API (e.g. Solapi, Aligo) with Axios/Fetch
            const kakaoTemplateId = useCase ? this.templateIdMap[useCase] : null;
            try {
                // MOCK API CALL
                // const response = await axios.post('https://api.kakaoprovider.example', { ... });
                // Simulate random failure to demonstrate SMS fallback
                const isSimulatedFailure = Math.random() < 0.2;
                if (isSimulatedFailure) {
                    throw new Error('Kakao AlimTalk delivery failed: User not registered or blocked.');
                }
                console.log(`[KakaoProvider] Successfully sent AlimTalk to ${to} (Template: ${kakaoTemplateId})`);
                return {
                    success: true,
                    messageId: `kakao_${Date.now()}`
                };
            }
            catch (error) {
                console.error(`[KakaoProvider] Error: ${error.message}`);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
}
exports.KakaoAlimTalkProvider = KakaoAlimTalkProvider;
