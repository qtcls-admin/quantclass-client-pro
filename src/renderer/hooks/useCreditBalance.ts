import { getCreditBalance } from "@/renderer/request"
import type { CreditBalanceResponse } from "@/shared/types"
import { type UseQueryOptions, useQuery } from "@tanstack/react-query"

// 积分余额查询的通用配置
const CREDIT_BALANCE_QUERY_CONFIG = {
	// 远程积分余额查询配置
	REMOTE: {
		STALE_TIME: 1000 * 60 * 3, // 3分钟内数据被认为是新鲜的
		REFETCH_INTERVAL: 1000 * 60 * 30, // 30分钟重新请求一次
		RETRY: 3, // 失败重试3次
		RETRY_DELAY: 2000, // 重试延迟2秒
	},
} as const

export function formatCreditBalance(
	balance: number | null | undefined,
): string {
	if (balance === null || balance === undefined) return "--"
	return Number.isInteger(balance)
		? balance.toLocaleString()
		: balance.toLocaleString(undefined, {
				minimumFractionDigits: 0,
				maximumFractionDigits: 3,
			})
}

/**
 * 查询用户积分余额
 * @param enabled - 是否启用查询，默认 true
 * @param options - 可选的 React Query 配置覆盖
 * @returns 积分余额信息和相关状态
 */
export const useCreditBalance = (
	enabled = true,
	options?: Partial<UseQueryOptions<CreditBalanceResponse | null, Error>>,
) => {
	const {
		data: creditBalance,
		isLoading: isLoadingCreditBalance,
		isFetching: isFetchingCreditBalance,
		refetch: refetchCreditBalance,
	} = useQuery({
		queryKey: ["credit-balance"],
		queryFn: async () => {
			try {
				return await getCreditBalance()
			} catch (error) {
				console.error("查询积分余额失败:", error)
				throw error
			}
		},
		enabled,
		staleTime: CREDIT_BALANCE_QUERY_CONFIG.REMOTE.STALE_TIME,
		refetchInterval: CREDIT_BALANCE_QUERY_CONFIG.REMOTE.REFETCH_INTERVAL,
		retry: CREDIT_BALANCE_QUERY_CONFIG.REMOTE.RETRY,
		retryDelay: CREDIT_BALANCE_QUERY_CONFIG.REMOTE.RETRY_DELAY,
		refetchOnReconnect: true,
		refetchOnWindowFocus: "always",
		...options,
	})

	return {
		creditBalance,
		isLoadingCreditBalance,
		isFetchingCreditBalance,
		refetchCreditBalance,
	}
}
