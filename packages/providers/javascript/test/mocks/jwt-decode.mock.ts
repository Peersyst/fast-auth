import { createMock, MethodMock } from "@shared/test";

export const JwtDecodeMock = createMock({
    decodeJwt: new MethodMock("mockReturnValue", undefined),
});

const jwtDecode = new JwtDecodeMock();

export const mockDecodeJwt = jwtDecode.decodeJwt;
export const decodeJwt = jwtDecode.decodeJwt;
