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
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
app_1.default.listen(env_1.PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    // DB 초기화 스크립트: 기본 관리자 및 사용자 생성
    try {
        // 1. admin 계정 확인/생성 (비밀번호: admin1)
        const adminExists = yield db_1.prisma.user.findUnique({ where: { username: 'admin' } });
        const adminPassword = yield bcrypt_1.default.hash('admin1', 10);
        if (!adminExists) {
            console.log('Creating default admin account...');
            yield db_1.prisma.user.create({
                data: { username: 'admin', password: adminPassword, roles: ['ADMIN'] }
            });
            console.log('✅ 초기 Admin 계정이 DB에 생성되었습니다.');
        }
        else {
            yield db_1.prisma.user.update({
                where: { username: 'admin' },
                data: { password: adminPassword }
            });
            console.log('✅ 기존 Admin 계정의 비밀번호를 admin1으로 업데이트했습니다.');
        }
        // 2. wjsdudtns 계정 확인/생성
        const userExists = yield db_1.prisma.user.findUnique({ where: { username: 'wjsdudtns' } });
        if (!userExists) {
            console.log('Creating primary operator account (wjsdudtns)...');
            const hashedPassword = yield bcrypt_1.default.hash('wjsdudtns1', 10);
            yield db_1.prisma.user.create({
                data: { username: 'wjsdudtns', password: hashedPassword, roles: ['LANDLORD'] }
            });
        }
    }
    catch (e) {
        console.error('Error in user initialization:', e);
    }
    console.log(`🚀 Hostel Management Server running on http://localhost:${env_1.PORT}`);
}));
