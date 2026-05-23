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
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.user.update({
            where: { username: 'admin' },
            data: { isSubscribed: false, subscriptionTier: 'FREE' }
        });
        const admin = yield prisma.user.findUnique({ where: { username: 'admin' } });
        if (!admin)
            return;
        yield prisma.room.deleteMany({ where: { userId: admin.id } });
        for (let i = 1; i <= 3; i++) {
            yield prisma.room.create({ data: { name: `기존방 ${i}`, rentType: '월세', deposit: 1000000, notes: '...', user: { connect: { id: admin.id } } } });
        }
        console.log('초기화 완료!');
    });
}
run().catch(console.error).finally(() => prisma.$disconnect());
