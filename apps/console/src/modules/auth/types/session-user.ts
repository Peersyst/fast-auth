import { Request } from "express";

export enum Role {
    USER = "user",
    ADMIN = "admin",
}

export type SessionUser = {
    email: string;
    emailVerified: boolean;
    role: Role;
};

export type AuthenticatedRequest = Request & { user: SessionUser };
