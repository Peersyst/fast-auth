export const FastAuthSignerGlobalMock = jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
}));
