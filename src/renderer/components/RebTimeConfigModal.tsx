/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	FEN_CLASS_URL,
	MemberPromoBanner,
	MemberPromoDialog,
} from "@/renderer/components/member-promo"
import {
	memberPromoBorderClassName,
	memberPromoGradientClassName,
} from "@/renderer/components/member-promo/theme"
import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/renderer/components/ui/tooltip"
import { cn } from "@/renderer/lib/utils"
import {
	rebTimeConfigAtom,
} from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import type {
	PosStrategyType,
	RebTimeConfig,
	SelectStgType,
} from "@/renderer/types/strategy"
import { regenerateRebTime } from "@/renderer/utils/strategy"
import { checkPermission } from "@/shared/lib/permission"
import { useAtom, useAtomValue } from "jotai"
import { ArrowUpRight, Clock, InfoIcon, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

const { checkKernalRunning } = window.electronAPI

interface RebTimeConfigModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

/** 基础版固定换仓时间槽位 */
const BASIC_REBALANCE_TIMES = ["open", "close-open"] as const

const formatTimeValue = (
	time: { hour: number; minute: number; second?: number } | undefined,
): string => {
	if (!time) return "--:--:--"
	const hour = time.hour.toString().padStart(2, "0")
	const minute = time.minute.toString().padStart(2, "0")
	const second = (time.second ?? 0).toString().padStart(2, "0")
	return `${hour}:${minute}:${second}`
}

function RebTimeConfigInfoBanner({ isMember }: { isMember: boolean }) {
	const { openUrl } = window.electronAPI
	const [promoOpen, setPromoOpen] = useState(false)

	return (
		<div className="space-y-3">
			<div className="flex gap-3 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] px-4 py-3 text-sm dark:border-blue-400/25 dark:bg-blue-500/10">
				<InfoIcon className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
				<p className="min-w-0 flex-1 text-blue-900/90 leading-relaxed dark:text-blue-100/90">
					在此统一配置同一 <span className="font-semibold">rebalance_time</span>{" "}
					下各策略的换仓时间（卖出/买入时间）。下方每个区块对应一种换仓模式，其下列出的策略将共用该模式的换仓时间。
				</p>
			</div>

			{!isMember && (
				<>
					<div className="overflow-hidden rounded-lg border bg-card">
						<div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
							<p className="text-sm text-muted-foreground">
								<span className="font-medium text-foreground">
									当前为基础版
								</span>
								<span className="mx-1.5 text-border">·</span>
								下方 2 个固定换仓时间
							</p>
							<button
								type="button"
								className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-blue-800 hover:text-blue-950 dark:text-blue-200 dark:hover:text-blue-100"
								onClick={() => openUrl(FEN_CLASS_URL)}
							>
								了解分享会
								<ArrowUpRight className="size-3" />
							</button>
						</div>

						<div className="grid grid-cols-2">
							<div className="flex min-h-[88px] flex-col justify-center gap-2 px-4 py-3">
								<span className="text-xs font-medium text-muted-foreground">
									基础版
								</span>
								<div className="flex flex-wrap items-center gap-1.5">
									<code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
										open
									</code>
									<code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
										close-open
									</code>
								</div>
								<span className="text-xs text-muted-foreground">固定 2 种</span>
							</div>

							<div
								className={cn(
									"flex min-h-[88px] flex-wrap items-center gap-3 border-l px-4 py-3",
									memberPromoGradientClassName,
									memberPromoBorderClassName,
								)}
							>
								<div className="flex items-baseline gap-1">
									<span className="text-lg font-semibold leading-none tracking-tight text-blue-900 dark:text-blue-200">
										50+
									</span>
									<span className="text-xs text-blue-800/80 dark:text-blue-300/80">
										换仓时间点
									</span>
								</div>
								<MemberPromoBanner
									learnMoreLabel="多种换仓时间点的作用？"
									onLearnMore={() => setPromoOpen(true)}
								/>
							</div>
						</div>
					</div>
					<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />
				</>
			)}
		</div>
	)
}

function RebTimeConfigBody() {
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [regeneratingRebTime, setRegeneratingRebTime] = useState<string | null>(
		null,
	)

	const handleRegenerateRebTime = async (rebTime: string) => {
		const isRunning = await checkKernalRunning(["rocket"])
		if (isRunning) {
			toast.warning("实盘内核正在运行中，无法修改换仓时间配置")
			return
		}

		setRegeneratingRebTime(rebTime)

		try {
			const newRebTimeConfig = regenerateRebTime(rebTimeConfig, rebTime)
			setRebTimeConfig(newRebTimeConfig)
			toast.success(`已重新生成 "${rebTime}" 的换仓时间`)
		} catch (error) {
			console.error("重新生成换仓时间失败:", error)
			toast.error("重新生成换仓时间失败")
		} finally {
			setRegeneratingRebTime(null)
		}
	}

	const rebTimeEntries = useMemo((): [string, RebTimeConfig][] => {
		if (isMember) {
			return Object.entries(rebTimeConfig)
		}

		return BASIC_REBALANCE_TIMES.map((rebTime) => {
			const config = rebTimeConfig[rebTime]
			if (config) return [rebTime, config]

			return [
				rebTime,
				{
					sell_time: undefined as unknown as RebTimeConfig["sell_time"],
					buy_time: undefined as unknown as RebTimeConfig["buy_time"],
					strategies: [],
				},
			]
		})
	}, [isMember, rebTimeConfig])

	return (
		<div className="space-y-4">
			<RebTimeConfigInfoBanner isMember={isMember} />
			{rebTimeEntries.length === 0 ? (
				<div className="text-center py-8 text-muted-foreground">
					<p>暂无换仓时间配置</p>
					<p className="text-sm mt-2">请先导入策略</p>
				</div>
			) : (
				<>
					{rebTimeEntries.map(([rebTime, config]) => (
						<div key={rebTime} className="border rounded-lg p-4">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<span className="font-medium text-lg">{rebTime}</span>
								</div>
								<Button
									size="sm"
									variant="outline"
									disabled={regeneratingRebTime === rebTime}
									onClick={() => handleRegenerateRebTime(rebTime)}
									className="gap-1"
								>
									<RefreshCw
										className={`size-4 ${
											regeneratingRebTime === rebTime ? "animate-spin" : ""
										}`}
									/>
									{regeneratingRebTime === rebTime
										? "生成中..."
										: "重新生成换仓时间"}
								</Button>
							</div>

							<div className="grid grid-cols-2 gap-4 mb-3">
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										卖出时间:
									</span>
									<span className="font-mono text-sm bg-muted px-2 py-1 rounded">
										{formatTimeValue(config.sell_time)}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										买入时间:
									</span>
									<span className="font-mono text-sm bg-muted px-2 py-1 rounded">
										{formatTimeValue(config.buy_time)}
									</span>
								</div>
							</div>

							<div className="border-t pt-3">
								<div className="flex items-center gap-1 mb-2">
									<span className="text-sm text-muted-foreground">
										使用此换仓时间的策略 ({config.strategies.length}):
									</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<InfoIcon className="size-3.5 text-muted-foreground cursor-pointer" />
										</TooltipTrigger>
										<TooltipContent>
											<p className="text-xs">这些策略共享相同的卖出/买入时间</p>
										</TooltipContent>
									</Tooltip>
								</div>
								{config.strategies.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{config.strategies.map(
											(
												strategy: SelectStgType | PosStrategyType,
												index: number,
											) => (
												<span
													key={`${strategy.name}-${index}`}
													className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
												>
													{strategy.name}
												</span>
											),
										)}
									</div>
								) : (
									<span className="text-xs text-muted-foreground">
										暂无策略
									</span>
								)}
							</div>
						</div>
					))}
				</>
			)}
		</div>
	)
}

export default function RebTimeConfigModal({
	open,
	onOpenChange,
}: RebTimeConfigModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Clock className="size-5" />
						换仓时间配置
					</DialogTitle>
				</DialogHeader>
				<RebTimeConfigBody />
			</DialogContent>
		</Dialog>
	)
}

// 用于嵌在 Tabs 里
export function RebTimeConfigContent() {
	return <RebTimeConfigBody />
}
