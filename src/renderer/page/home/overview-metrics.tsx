/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { NumberTicker } from "@/renderer/components/ui/number-ticker"
import { usePermissionCheck } from "@/renderer/hooks"
import { useKernelModulesStatus } from "@/renderer/hooks/useKernelModulesStatus"
import { useProductList } from "@/renderer/hooks/useProductList"
import { cn } from "@/renderer/lib/utils"
import type { PositionStrategyInfoType } from "@/renderer/page/position/types"
import { unreadNotificationCountAtom } from "@/renderer/store"
import { loadAccountQueryAtom } from "@/renderer/store/query"
import {
	fusionAtom,
	libraryTypeAtom,
	selectStgListAtom,
} from "@/renderer/store/storage"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { canIncrementalUpdate } from "@/renderer/utils/data-sync-status"
import { sumStrategyDailyMetrics } from "@/renderer/utils/strategy-performance"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import { useEffect, useMemo } from "react"

const { loadPositionJson } = window.electronAPI
const STRATEGY_PERFORMANCE_FILENAME = "策略表现"

interface OverviewMetricsProps {
	showFinanceInfo: boolean
}

function useStrategyRunStats() {
	const libraryType = useAtomValue(libraryTypeAtom)
	const selectStgList = useAtomValue(selectStgListAtom)
	const fusion = useAtomValue(fusionAtom)

	return useMemo(() => {
		const strategies =
			libraryType === "pos"
				? (fusion as (SelectStgType | StgGroupType | PosStrategyType)[])
				: selectStgList

		const total = strategies.length
		const running = strategies.filter(
			(strategy) => (strategy.cap_weight ?? 0) !== 0,
		).length
		const paused = total - running

		return { total, running, paused }
	}, [libraryType, selectStgList, fusion])
}

export function OverviewMetrics({ showFinanceInfo }: OverviewMetricsProps) {
	const { checkWithToast } = usePermissionCheck()
	const { productList } = useProductList()
	const [{ data: accountData, refetch: refetchAccount }] =
		useAtom(loadAccountQueryAtom)
	const {
		data: strategyPerformance,
		isLoading: strategyPerformanceLoading,
		refetch: refetchStrategyPerformance,
	} = useQuery({
		queryKey: ["load-positions", STRATEGY_PERFORMANCE_FILENAME],
		queryFn: async () => await loadPositionJson(STRATEGY_PERFORMANCE_FILENAME),
		retry: false,
		refetchInterval: 1000 * 90,
	})
	const { running, total, paused } = useStrategyRunStats()
	const { runningCount, totalCount, chipStatus } = useKernelModulesStatus()
	const unreadNotificationCount = useAtomValue(unreadNotificationCountAtom)

	const subscribedCount = productList.length
	const laggingCount = useMemo(
		() => productList.filter(canIncrementalUpdate).length,
		[productList],
	)

	const { totalPnl, totalReturn, strategyCount } = useMemo(() => {
		const strategyData = (strategyPerformance?.data ??
			[]) as PositionStrategyInfoType[]
		const metrics = sumStrategyDailyMetrics(strategyData)
		const totalAssets = accountData?.总资产 ?? 0
		const totalReturn =
			totalAssets > 0 ? metrics.totalPnl / totalAssets : 0
		return {
			totalPnl: metrics.totalPnl,
			totalReturn,
			strategyCount: metrics.count,
		}
	}, [strategyPerformance, accountData?.总资产])

	const pnlColorClass = cn(
		totalPnl > 0 && "text-red-600",
		totalPnl < 0 && "text-green-600",
		totalPnl === 0 && "text-muted-foreground",
	)

	const pnlSubtextClass = cn(
		"text-[11px] font-mono mt-1",
		totalReturn > 0 && "text-red-500",
		totalReturn < 0 && "text-green-500",
		totalReturn === 0 && "text-muted-foreground",
	)

	const dataLagMetricClass = cn(
		"text-xl font-bold font-mono tracking-tight leading-none",
		subscribedCount === 0 && "text-muted-foreground",
		subscribedCount > 0 && laggingCount === 0 && "text-green-600",
		laggingCount > 0 && "text-amber-500",
	)

	const dataLagSubtextClass = cn(
		"text-[11px] font-mono mt-1",
		subscribedCount === 0 && "text-muted-foreground",
		subscribedCount > 0 && laggingCount === 0 && "text-green-600",
		laggingCount > 0 && "text-amber-500",
	)

	const unreadMetricClass = cn(
		"text-lg font-bold font-mono leading-none",
		unreadNotificationCount > 0 ? "text-amber-500" : "text-muted-foreground",
	)

	const queueMetricClass = cn(
		"text-lg font-bold font-mono leading-none",
		chipStatus === "ok" && "text-green-600",
		chipStatus === "warn" && "text-amber-500",
		chipStatus === "idle" && "text-muted-foreground",
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot on mount
	useEffect(() => {
		if (
			checkWithToast({
				requireMember: true,
				windowsOnly: true,
				skipToast: true,
			}).isValid
		) {
			void refetchAccount()
		}
	}, [])

	// biome-ignore lint/correctness/useExhaustiveDependencies: refetch on mount, same as position page
	useEffect(() => {
		if (!strategyPerformanceLoading) {
			void refetchStrategyPerformance()
		}
	}, [])

	return (
		<>
			<div className="grid grid-cols-4 gap-3 mb-4">
				<div className="border border-border rounded-lg px-3 py-2.5 bg-background">
					<div className="text-xs text-muted-foreground mb-1">系统健康</div>
					<div className="text-lg font-bold font-mono leading-none text-green-600">
						100%
					</div>
				</div>
				<div className="border border-border rounded-lg px-3 py-2.5 bg-background">
					<div className="text-xs text-muted-foreground mb-1">订阅数据</div>
					<div className="text-lg font-bold font-mono leading-none">
						{subscribedCount} 份
					</div>
				</div>
				<div className="border border-border rounded-lg px-3 py-2.5 bg-background">
					<div className="text-xs text-muted-foreground mb-1">运行内核</div>
					<div className={queueMetricClass}>
						{runningCount}/{totalCount}
					</div>
				</div>
				<div className="border border-border rounded-lg px-3 py-2.5 bg-background">
					<div className="text-xs text-muted-foreground mb-1">未读通知</div>
					<div className={unreadMetricClass}>{unreadNotificationCount}</div>
				</div>
			</div>

			<div className="flex border border-border rounded-xl mb-4 overflow-hidden bg-background">
				<div className="flex-1 px-4 py-3.5 border-r border-border">
					<div className="text-xs text-muted-foreground mb-1.5">
						实盘总资产(3 组合合计)
					</div>
					<div className="text-xl font-bold font-mono tracking-tight leading-none">
						{showFinanceInfo ? (
							accountData?.总资产 ? (
								<>
									¥
									<NumberTicker value={accountData.总资产} />
								</>
							) : (
								"--"
							)
						) : (
							"****"
						)}
					</div>
					<div className="text-[11px] font-mono text-muted-foreground mt-1">
						独立账户分别托管
					</div>
				</div>
				<div className="flex-1 px-4 py-3.5 border-r border-border">
					<div className="text-xs text-muted-foreground mb-1.5">今日总盈亏</div>
					<div className="text-xl font-bold font-mono tracking-tight leading-none">
						{showFinanceInfo ? (
							strategyCount > 0 ? (
								<>
									<span className={pnlColorClass}>
										{totalPnl > 0 ? "+" : totalPnl < 0 ? "-" : ""}
									</span>
									<span className="text-foreground">¥</span>
									<span className={pnlColorClass}>
										<NumberTicker value={Math.abs(totalPnl)} />
									</span>
								</>
							) : (
								"--"
							)
						) : (
							"****"
						)}
					</div>
					<div className={pnlSubtextClass}>
						{showFinanceInfo ? (
							strategyCount > 0 ? (
								<>
									{totalReturn > 0 ? "+" : ""}
									{(totalReturn * 100).toFixed(2)}%
								</>
							) : (
								"--"
							)
						) : (
							"--"
						)}
					</div>
				</div>
				<div className="flex-1 px-4 py-3.5 border-r border-border">
					<div className="text-xs text-muted-foreground mb-1.5">运行中策略</div>
					<div className="text-xl font-bold font-mono tracking-tight leading-none">
						{running}
						{total > 0 ? (
							<span className="text-sm font-medium text-muted-foreground">
								{" "}
								/ {total}
							</span>
						) : null}
					</div>
					<div className="text-[11px] font-mono text-muted-foreground mt-1">
						{paused > 0
							? `${paused} 已暂停`
							: total === 0
								? "暂无策略"
								: "全部运行中"}
					</div>
				</div>
				<div className="flex-1 px-4 py-3.5">
					<div className="text-xs text-muted-foreground mb-1.5">数据就绪度</div>
					<div className={dataLagMetricClass}>
						{laggingCount}
						{subscribedCount > 0 ? (
							<span className="text-sm font-medium text-muted-foreground">
								{" "}
								项
							</span>
						) : null}
					</div>
					<div className={dataLagSubtextClass}>
						{subscribedCount === 0
							? "暂无订阅"
							: laggingCount > 0
								? "数据集待更新"
								: "全部就绪"}
					</div>
				</div>
			</div>
		</>
	)
}
