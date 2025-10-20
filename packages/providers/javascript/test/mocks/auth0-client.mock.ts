import { createMock, MethodMock } from "@shared/test";

// Create a reusable mock class for the Auth0Client-like instance
export const Auth0ClientMock = createMock({
    handleRedirectCallback: new MethodMock("mockResolvedValue", undefined),
    isAuthenticated: new MethodMock("mockResolvedValue", false),
    loginWithRedirect: new MethodMock("mockResolvedValue", undefined),
    logout: new MethodMock("mockResolvedValue", undefined),
    getTokenSilently: new MethodMock("mockResolvedValue", undefined),
});

// Provide a shared instance for module factory consumption
export const mockAuth0Client = new Auth0ClientMock();
