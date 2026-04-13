"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NODE_ENV = exports.JWT_SECRET = exports.PORT = void 0;
exports.PORT = process.env.PORT || 3000;
exports.JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
exports.NODE_ENV = process.env.NODE_ENV || 'development';
