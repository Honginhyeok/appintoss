"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VAPID_SUBJECT = exports.VAPID_PRIVATE_KEY = exports.VAPID_PUBLIC_KEY = void 0;
const web_push_1 = __importDefault(require("web-push"));
exports.VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BJw32U00yq1WQQlJv1p34E7gV_9B5j_I3hJqZbF8SIfVlLZd7Yy1_y7m1530TjAEX7FhE-UvDqXJ-tX_U2qB6G4';
exports.VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'rA-eX9g2H4cJf1V8q5tZ7wY0hL3v1D4w5G9a6D2wE5w';
exports.VAPID_SUBJECT = 'mailto:admin@checkincaptain.com';
web_push_1.default.setVapidDetails(exports.VAPID_SUBJECT, exports.VAPID_PUBLIC_KEY, exports.VAPID_PRIVATE_KEY);
exports.default = web_push_1.default;
