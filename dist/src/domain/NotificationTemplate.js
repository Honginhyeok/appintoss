"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES = exports.NotificationUseCase = void 0;
exports.compileTemplate = compileTemplate;
var NotificationUseCase;
(function (NotificationUseCase) {
    NotificationUseCase["RENT_DUE"] = "RENT_DUE";
    NotificationUseCase["OVERDUE_PAYMENT"] = "OVERDUE_PAYMENT";
    NotificationUseCase["CONTRACT_ENDING"] = "CONTRACT_ENDING";
    NotificationUseCase["MAINTENANCE_REQUEST_RECEIVED"] = "MAINTENANCE_REQUEST_RECEIVED";
    NotificationUseCase["MAINTENANCE_COMPLETED"] = "MAINTENANCE_COMPLETED";
})(NotificationUseCase || (exports.NotificationUseCase = NotificationUseCase = {}));
exports.TEMPLATES = {
    [NotificationUseCase.RENT_DUE]: '[알림] {{tenantName}}님, 다음 달 임대료 {{amount}}원의 납부일은 {{dueDate}}입니다.',
    [NotificationUseCase.OVERDUE_PAYMENT]: '[경고] {{tenantName}}님, 임대료 {{amount}}원이 미납되었습니다. 빠른 시일 내에 납부 부탁드립니다.',
    [NotificationUseCase.CONTRACT_ENDING]: '[안내] {{tenantName}}님, 계약 만료일이 {{endDate}}로 다가오고 있습니다. 연장 여부를 확인해주세요.',
    [NotificationUseCase.MAINTENANCE_REQUEST_RECEIVED]: '[접수] 유지보수 요청이 성공적으로 접수되었습니다. (요청내용: {{requestDetails}})',
    [NotificationUseCase.MAINTENANCE_COMPLETED]: '[완료] 접수하신 유지보수 작업이 완료되었습니다. 확인바랍니다.'
};
/**
 * Replaces placeholders in the format {{key}} with actual values.
 */
function compileTemplate(useCase, data) {
    const template = exports.TEMPLATES[useCase];
    if (!template)
        throw new Error(`Template not found for use case: ${useCase}`);
    return Object.keys(data).reduce((text, key) => {
        const value = String(data[key]);
        return text.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }, template);
}
