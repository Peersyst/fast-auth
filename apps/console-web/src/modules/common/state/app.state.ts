import { create } from "zustand";

export interface AppState {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
}

export interface UseAppState extends AppState {
    setIsLoading: () => void;
    setIsError: () => void;
    setIsSuccess: () => void;
}

export const useAppState = create<UseAppState>((set) => ({
    isLoading: true,
    isError: false,
    isSuccess: false,
    setIsLoading: () => set({ isLoading: true, isError: false, isSuccess: false }),
    setIsError: () => set({ isError: true, isLoading: false, isSuccess: false }),
    setIsSuccess: () => set({ isSuccess: true, isLoading: false, isError: false }),
}));
