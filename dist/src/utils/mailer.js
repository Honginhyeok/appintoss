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
exports.sendEmailAlert = sendEmailAlert;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    }
};
const transporter = nodemailer_1.default.createTransport(config);
function sendEmailAlert(to, subject, text) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config.auth.user || !config.auth.pass) {
            console.log('[Mailer] SMTP credentials not set. Simulating email:');
            console.log(`To: ${to}\nSubject: ${subject}\nText: ${text}`);
            return;
        }
        try {
            yield transporter.sendMail({
                from: `"체크인사장님 알림" <${config.auth.user}>`,
                to,
                subject,
                text
            });
            console.log(`[Mailer] Email sent to ${to}`);
        }
        catch (err) {
            console.error(`[Mailer] Error sending email:`, err);
        }
    });
}
