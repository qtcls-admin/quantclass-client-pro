/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ReTimingDisplay } from "@/renderer/components/ReTimingDisplay"
import { useBacktestDialog } from "@/renderer/components/backtest-dialog"
import { MemberPromoDialog } from "@/renderer/components/member-promo"
import {
	memberPromoBorderClassName,
	memberPromoGradientClassName,
	memberPromoMutedTextClassName,
	memberPromoShimmerOverlayClassName,
	memberPromoTextClassName,
} from "@/renderer/components/member-promo/theme"
import { Button } from "@/renderer/components/ui/button"
import { Input } from "@/renderer/components/ui/input"
import { H2 } from "@/renderer/components/ui/typography"
import { TRADING_SECTION_ROUTE } from "@/renderer/constant"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { cn } from "@/renderer/lib/utils"
import { RatioIntro } from "@/renderer/page/FAQ/ratioIntro"
import { StrategyCard } from "@/renderer/page/library/basic/strategy-card"
import StgImportButton, {
	type StgImportHandle,
} from "@/renderer/page/library/import-btn"
import { backtestConfigAtom, reTimingAtom } from "@/renderer/store/storage"
import { BASIC_SELECT_STRATEGY_IMPORT_LIMIT } from "@/shared/lib/basic-strategy-import"
import { useUnmount } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import {
	AlignVerticalSpaceAround,
	Crown,
	Edit,
	PencilRuler,
	Plus,
	Sparkles,
	TvMinimalPlay,
} from "lucide-react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

function AddStrategyCard({
	onClick,
	disabled,
}: {
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card/40 disabled:hover:text-muted-foreground"
		>
			<Plus className="size-8" strokeWidth={1.75} />
			<span className="text-sm font-medium">添加策略</span>
		</button>
	)
}

export default function BasicStrategyLibrary() {
	const { setStoreValue } = window.electronAPI
	const [isEditing, setIsEditing] = useState(false)
	const [promoOpen, setPromoOpen] = useState(false)
	const [backtestConfig, setBacktestConfig] = useAtom(backtestConfigAtom)
	const { selectStgList, updateSelectStgList } = useStrategyManager()
	const { isAutoRocket } = useToggleAutoRealTrading()
	const { openBacktest } = useBacktestDialog()
	const reTiming = useAtomValue(reTimingAtom)
	const navigate = useNavigate()
	const importRef = useRef<StgImportHandle>(null)
	const backtestName = backtestConfig.backtest_name
	const canAddMore = selectStgList.length < BASIC_SELECT_STRATEGY_IMPORT_LIMIT

	useUnmount(() => {
		setStoreValue("stock_quant.backtest_name", backtestConfig.backtest_name)
	})

	return (
		<div className="flex flex-col gap-4 pt-3">
			<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />

			<div className="w-full">
				<div className="flex items-center gap-2 w-auto">
					{isEditing ? (
						<Input
							autoFocus
							value={backtestName}
							onChange={(e) =>
								setBacktestConfig((p) => ({
									...p,
									backtest_name: e.target.value,
								}))
							}
							className="text-2xl font-semibold tracking-tight h-10 w-auto"
							onBlur={() => setIsEditing(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setIsEditing(false)
								}
							}}
						/>
					) : (
						<>
							<H2>{backtestName}</H2>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								onClick={() => setIsEditing(true)}
							>
								<Edit />
							</Button>
						</>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					导入、查看、编辑各类策略。并设置策略的实盘资金占比
				</p>
			</div>
			<div
				className={cn(
					"relative flex w-fit max-w-full items-center gap-4 overflow-hidden rounded-full border px-5 py-3",
					memberPromoGradientClassName,
					memberPromoBorderClassName,
				)}
			>
				<div aria-hidden className={memberPromoShimmerOverlayClassName} />
				<div className="relative z-10 flex shrink-0 flex-col items-center gap-1">
					<Crown
						className="size-6 text-muted-foreground/50"
						strokeWidth={1.5}
					/>
					<span className="text-[10px] font-medium text-muted-foreground/70 leading-none">
						基础课程
					</span>
				</div>

				<div className="relative z-10 flex w-56 shrink-0 flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span
							className={cn("text-xs font-medium", memberPromoTextClassName)}
						>
							策略导入进度
						</span>
						<span
							className={cn(
								"text-xs font-semibold tabular-nums",
								memberPromoTextClassName,
							)}
						>
							{selectStgList.length} / {BASIC_SELECT_STRATEGY_IMPORT_LIMIT}
						</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-900/40">
						<div
							className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
							style={{
								width: `${Math.min((selectStgList.length / BASIC_SELECT_STRATEGY_IMPORT_LIMIT) * 100, 100)}%`,
							}}
						/>
					</div>
					<span className={cn("text-[11px]", memberPromoMutedTextClassName)}>
						基础课程最多导入 {BASIC_SELECT_STRATEGY_IMPORT_LIMIT} 个策略
					</span>
				</div>

				<div className="relative z-10 flex shrink-0 items-center gap-2 border-l border-blue-300/50 pl-4 dark:border-blue-700/50">
					<Sparkles
						className="size-4 shrink-0 text-violet-500"
						strokeWidth={1.75}
					/>
					<div className="flex flex-col gap-0.5">
						<span
							className={cn("text-xs font-semibold", memberPromoTextClassName)}
						>
							分享会专属策略库
						</span>
						<button
							type="button"
							onClick={() => setPromoOpen(true)}
							className={cn(
								"text-left text-[11px] underline underline-offset-2 transition-opacity hover:opacity-80",
								memberPromoMutedTextClassName,
							)}
						>
							了解更多 →
						</button>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<StgImportButton ref={importRef} />
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				{selectStgList.map((strategy, index) => (
					<StrategyCard
						key={`${strategy.name ?? "stg"}-${index}`}
						strategy={strategy}
						index={index}
					/>
				))}
				{canAddMore && (
					<AddStrategyCard
						disabled={isAutoRocket}
						onClick={() => importRef.current?.openImport()}
					/>
				)}
			</div>

			<ReTimingDisplay reTiming={reTiming} />
			<div className="flex items-center justify-between gap-2">
				<Button
					size="sm"
					className="h-8 lg:flex"
					disabled={isAutoRocket || selectStgList.length === 0}
					onClick={async () => {
						if (selectStgList.length === 0) {
							toast.warning("请先导入策略")
							return
						}
						const avgCapWeight = Number.parseFloat(
							(1 / selectStgList.length).toFixed(7),
						)
						const strategies = selectStgList.map((s) => ({
							...s,
							cap_weight: avgCapWeight,
						}))

						try {
							await updateSelectStgList(strategies)
							toast.success(`平均分配权重，每个策略为${avgCapWeight * 100}%`)
						} catch {
							toast.error("保存策略失败")
						}
					}}
				>
					<AlignVerticalSpaceAround className="size-4 mr-2" />
					平均分配权重
				</Button>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={isAutoRocket}
						className="h-8 lg:flex"
						onClick={openBacktest}
					>
						<PencilRuler className="size-4 mr-2" />
						前往回测
					</Button>

					<Button
						size="sm"
						variant="outline"
						className="h-8 lg:flex"
						onClick={() =>
							navigate(`${TRADING_SECTION_ROUTE}?tab=real_trading`)
						}
					>
						<TvMinimalPlay className="size-4 mr-2" />
						前往实盘
					</Button>
				</div>
			</div>
			<hr />
			<RatioIntro />
		</div>
	)
}
