import { mockify } from "@shared/test";
import { MeDto } from "../../../src/models/MeDto";

export const MeMock = mockify<MeDto>({
    email: "owner@example.com",
    role: "user",
    emailVerified: true,
});
