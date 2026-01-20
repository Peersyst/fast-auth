/**
 * @deprecated This hook has been refactored into smaller, more focused hooks.
 * Please use the following hooks instead:
 * - useAuth() for authentication logic
 * - useAccountManager() for account creation and selection
 * - useTransactionSigner() for transaction signing and broadcasting
 * - useWorkflow() for a simplified composite hook that combines all the above
 *
 * This export is kept for backward compatibility.
 */
export { useWorkflow as useFastAuthWorkflow } from "./use-workflow";
