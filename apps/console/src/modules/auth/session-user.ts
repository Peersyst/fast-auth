import type { Request } from "express";

export const Role = {
    User: "user",
    Admin: "admin",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export type SessionUser = {
    sub: string;
    email: string;
    emailVerified: boolean;
    role: Role;
};

export type AuthenticatedRequest = Request & { user: SessionUser };
