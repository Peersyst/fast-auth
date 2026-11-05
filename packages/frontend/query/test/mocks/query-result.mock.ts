import { UseQueryResult } from "@tanstack/react-query";
import { mockify } from "@shared/test";

export const QueryResultMock = mockify<UseQueryResult<any>>({
    isLoading: false,
    isFetching: false,
    isPending: false,
    data: null,
});
