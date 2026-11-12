import { UseMutationResult } from "@tanstack/react-query";
import { mockify } from "@shared/test";

export const MutationResultMock = mockify<UseMutationResult<any, any, any>>({
    isPending: false,
    mutate: jest.fn(),
});
