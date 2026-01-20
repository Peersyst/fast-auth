/**
 * FastAuth Hooks
 *
 * This module provides React hooks for integrating FastAuth into your application.
 *
 * ## Core Hooks
 *
 * ### useFastAuth
 * Context provider hook for FastAuth client and relayer initialization.
 * Must be used within a FastAuthProvider.
 *
 * ### useAuth
 * Handles user authentication and signer management.
 * Returns authentication state and login action.
 *
 * ### useAccountManager
 * Manages NEAR account creation and selection.
 * Requires a signer instance from useAuth.
 *
 * ### useTransactionSigner
 * Handles transaction signing and broadcasting.
 * Requires signer and public key from useAuth.
 *
 * ### useWorkflow
 * Composite hook that combines all the above hooks with UI state management.
 * Recommended for most use cases as it provides a complete workflow.
 *
 * ## Usage Example
 *
 * ```tsx
 * import { useWorkflow } from './hooks';
 *
 * function MyComponent() {
 *   const {
 *     loggedIn,
 *     publicKey,
 *     handleLogin,
 *     handleCreateAccount,
 *     requestTransactionSignature,
 *     handleSignTransaction,
 *     handleSendTransaction,
 *   } = useWorkflow();
 *
 *   // Use the workflow state and actions in your component
 * }
 * ```
 *
 * ## Advanced Usage
 *
 * For more granular control, use individual hooks:
 *
 * ```tsx
 * import { useAuth, useAccountManager, useTransactionSigner } from './hooks';
 *
 * function MyComponent() {
 *   const { signer, publicKey } = useAuth();
 *   const { createAccount } = useAccountManager({ signer });
 *   const { sign, send } = useTransactionSigner({ signer, publicKey });
 *
 *   // Implement custom workflow logic
 * }
 * ```
 */

export { FastAuthProvider, useFastAuth, type ProviderType } from "./use-fast-auth-relayer";
export { useAuth } from "./use-auth";
export { useAccountManager } from "./use-account-manager";
export { useTransactionSigner } from "./use-transaction-signer";
export { useWorkflow } from "./use-workflow";
export type { AuthState, AccountState, TransactionState, FastAuthSignerType } from "./types";

// Backward compatibility
export { useFastAuthWorkflow } from "./use-fast-auth-workflow";
