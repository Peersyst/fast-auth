import { useContext } from "react";
import { FastAuthContext, IFastAuthContext } from "../providers/fast-auth.provider";

export function useFastAuth(): IFastAuthContext {
    const context = useContext(FastAuthContext);
    if (context === null) {
        throw new Error("useFastAuth must be used within a FastAuthProvider");
    }
    return context;
}