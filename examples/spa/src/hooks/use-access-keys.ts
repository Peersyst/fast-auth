import { useState, useCallback, useEffect } from "react";
import { useFastAuth } from "./use-fast-auth-relayer";
import { AccessKeyView } from "near-api-js/lib/providers/provider";
import config from "../auth_config.json";

export interface AccessKeyInfo {
    publicKey: string;
    accessKey: AccessKeyView;
    accountId: string;
}

interface FastNearApiResponse {
    account_ids: string[];
    public_key: string;
}

/**
 * Query FastNear API to get all account IDs associated with a public key
 */
async function getAccountIdsByPublicKey(publicKey: string): Promise<string[]> {
    try {
        const response = await fetch(`${config.near.fastNearApiBaseUrl}/public_key/${encodeURIComponent(publicKey)}/all`);
        if (!response.ok) {
            throw new Error(`Failed to fetch account IDs: ${response.statusText}`);
        }
        const data: FastNearApiResponse = await response.json();
        return data.account_ids || [];
    } catch (err) {
        throw new Error(`Error querying FastNear API: ${err instanceof Error ? err.message : String(err)}`);
    }
}

export function useAccessKeys() {
    const { relayer } = useFastAuth();
    const [accessKeys, setAccessKeys] = useState<AccessKeyInfo[]>([]);
    const [accountIds, setAccountIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    // Clear access keys when network changes
    useEffect(() => {
        setAccessKeys([]);
        setAccountIds([]);
        setError(null);
        setHasFetched(false);
    }, []);

    const fetchAccessKeys = useCallback(
        async (publicKey: string) => {
            if (!relayer) {
                setError(new Error("Relayer not initialized"));
                return;
            }

            setLoading(true);
            setError(null);
            setAccessKeys([]);
            setAccountIds([]);
            setHasFetched(false);

            try {
                // Step 1: Get account IDs from FastNear API
                const accountIdsList = await getAccountIdsByPublicKey(publicKey);
                setAccountIds(accountIdsList);

                setHasFetched(true);
                
                if (accountIdsList.length === 0) {
                    setAccessKeys([]);
                    setLoading(false);
                    return;
                }

                // Step 2: Fetch access keys for all accounts
                const connection = relayer.getConnection();
                const allAccessKeys: AccessKeyInfo[] = [];

                for (const accountId of accountIdsList) {
                    try {
                        const result = await connection.connection.provider.query({
                            request_type: "view_access_key_list",
                            finality: "final",
                            account_id: accountId,
                        });

                        // The result contains an array of access keys with public_key and access_key
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const keys: AccessKeyInfo[] = (result as any).keys.map((item: any) => ({
                            publicKey: item.public_key,
                            accessKey: item.access_key,
                            accountId: accountId,
                        }));

                        allAccessKeys.push(...keys);
                    } catch (err) {
                        console.error(`Failed to fetch access keys for account ${accountId}:`, err);
                        // Continue with other accounts even if one fails
                    }
                }

                setAccessKeys(allAccessKeys);
                setHasFetched(true);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                setAccessKeys([]);
                setAccountIds([]);
                setHasFetched(true);
            } finally {
                setLoading(false);
            }
        },
        [relayer],
    );

    return {
        accessKeys,
        accountIds,
        loading,
        error,
        hasFetched,
        fetchAccessKeys,
    };
}

