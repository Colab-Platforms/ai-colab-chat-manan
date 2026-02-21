import * as express from "express";

declare global {
    namespace Express {
        interface User {
            id: number;
            role: "USER" | "ADMIN" | "SUPERADMIN";
            timezone: string;
        }

        interface Request {
            user?: User;
        }
    }
}