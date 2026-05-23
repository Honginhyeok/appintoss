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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch('http://localhost:3000/api/auth/login', {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: 'admin', password: 'admin123', role: 'ADMIN' })
        });
        const { token } = yield response.json();
        console.log("Token acquired.");
        const r2 = yield fetch('http://localhost:3000/api/rooms', {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ name: "테스트" })
        });
        const d2 = yield r2.text();
        console.log("Status:", r2.status);
        console.log("Response:", d2);
    });
}
run();
