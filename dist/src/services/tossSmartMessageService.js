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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTossSmartMessage = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * 토스 스마트 메시지(푸시 알림)를 발송하는 서비스입니다.
 *
 * @param userKey 토스 유저 고유 식별 키 (X-Toss-User-Key)
 * @param templateCode 토스 스마트 메시지 콘솔에서 설정한 '발송 코드'
 * @param context 알림 내용에 포함될 동적 변수들 (예: { amount: "500000" })
 */
const sendTossSmartMessage = (userKey_1, templateCode_1, ...args_1) => __awaiter(void 0, [userKey_1, templateCode_1, ...args_1], void 0, function* (userKey, templateCode, context = {}) {
    var _a;
    try {
        const response = yield axios_1.default.post('https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message', {
            templateSetCode: templateCode,
            context: context,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Toss-User-Key': userKey,
            },
        });
        console.log(`[Toss Smart Message] 성공적으로 발송되었습니다. (Template: ${templateCode})`);
        return response.data;
    }
    catch (error) {
        console.error('[Toss Smart Message] 발송 실패:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        throw error;
    }
});
exports.sendTossSmartMessage = sendTossSmartMessage;
