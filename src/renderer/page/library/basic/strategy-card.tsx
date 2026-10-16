/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import EditableNumberCell from "@/renderer/components/EditableNumberCell"
import { MemberPromoDialog } from "@/renderer/components/member-promo"
import { StrategyNameDisplay } from "@/renderer/components/strategy-name-display"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import { Card } from "@/renderer/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/renderer/components/ui/dropdown-menu"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { cn } from "@/renderer/lib/utils"
import { DeleteStrategy } from "@/renderer/page/strategy/delete"
import type {
	BasicRotationStgType,
	BasicSelectStgType,
	BasicStgType,
	BasicTimingStgType,
	SelectStgType,
} from "@/renderer/types/strategy"
import { resolveSelectStrategyName } from "@/shared/lib/real-market-strategy-name"
import {
	AlarmClockCheck,
	BarChart3,
	ChartPie,
	Filter,
	GitCompare,
	ListOrdered,
	type LucideIcon,
	MoreHorizontal,
	Percent,
	Repeat,
	Sparkles,
	Timer,
	Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type BasicStrategyType = "select" | "timing" | "rotation"

function isBasicRotationStgType(
	strategy: BasicStgType,
): strategy is BasicRotationStgType {
	return strategy.rotation != null
}

function isBasicTimingStgType(
	strategy: BasicStgType,
): strategy is BasicTimingStgType {
	return strategy.timing != null && strategy.rotation == null
}

function isBasicSelectStgType(
	strategy: BasicStgType,
): strategy is BasicSelectStgType {
	return strategy.rotation == null && strategy.timing == null
}

function getBasicStrategyType(strategy: BasicStgType): BasicStrategyType {
	if (isBasicRotationStgType(strategy)) return "rotation"
	if (isBasicTimingStgType(strategy)) return "timing"
	return "select"
}

const TYPE_LABELS: Record<BasicStrategyType, string> = {
	select: "选股策略",
	timing: "择时策略",
	rotation: "轮动策略",
}

const MEMBER_RAINBOW_TEXT =
	"bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-blue-300"

const TYPE_DOT_CLASS: Record<BasicStrategyType, string> = {
	select: "bg-white ring-1 ring-black/15 dark:ring-white/30",
	timing: "bg-[#FF6B9D]",
	rotation: "bg-[#007AFF]",
}

const MEMBER_EXCLUSIVE_FIELDS: {
	featureName: string
	label: string
	icon: LucideIcon
}[] = [
	{
		featureName: "后置过滤因子",
		label: "后置过滤因子功能",
		icon: Filter,
	},
	{
		featureName: "截面因子",
		label: "截面因子功能",
		icon: ChartPie,
	},
	{
		featureName: "个股择时",
		label: "个股择时功能",
		icon: AlarmClockCheck,
	},
	{
		featureName: "择时开仓/离场",
		label: "择时开仓/离场功能",
		icon: Timer,
	},
]

function getRebalanceTimeLabel(rebalanceTimeType: string): string {
	if (rebalanceTimeType === "close-open") return "隔日换仓"
	if (rebalanceTimeType === "open") return "早盘换仓"
	const [startTime, endTime] = rebalanceTimeType.split("-")
	if (startTime && endTime && startTime === endTime) {
		return `${startTime.slice(0, 2)}:${startTime.slice(2)}`
	}
	return rebalanceTimeType
}

function formatRawParamValue(value: unknown): string {
	if (value == null) return "--"
	if (typeof value === "object") return JSON.stringify(value)
	return String(value)
}

/** 苹果风分隔线 */
const DIVIDER = "border-t border-black/[0.06] dark:border-white/10"

function SpecCell({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon
	label: string
	value: string
}) {
	return (
		<div className="flex flex-col items-start gap-2 min-w-0">
			<Icon className="size-5 text-foreground/80" strokeWidth={1.6} />
			<div className="min-w-0">
				<div className="text-xs font-semibold leading-snug text-foreground">
					{label}
				</div>
				<div className="text-[11px] text-muted-foreground mt-0.5 break-all leading-snug">
					{value}
				</div>
			</div>
		</div>
	)
}

function FactorListGrid({ factors }: { factors?: unknown[] }) {
	if (!factors?.length) {
		return <p className="text-[11px] text-muted-foreground">暂无因子</p>
	}

	return (
		<div className="min-w-0">
			<div className="grid grid-cols-4 gap-x-2 text-[10px] text-muted-foreground mb-1.5">
				<span>因子名称</span>
				<span>排序方式</span>
				<span>因子参数</span>
				<span>因子计算参数（比如权重）</span>
			</div>
			<div className="space-y-1.5">
				{factors.map((item, index) => {
					if (!Array.isArray(item)) return null
					const factor = item as [
						string,
						boolean,
						unknown,
						string | number | null,
					]
					return (
						<div
							key={index}
							className="grid grid-cols-4 gap-x-2 text-[11px] text-muted-foreground break-all leading-snug"
						>
							<span>{factor[0] ?? "--"}</span>
							<span>
								{factor[1] ? "从小到大排序" : "从大到小排序"}
							</span>
							<span className="font-mono">
								{factor[2] != null ? JSON.stringify(factor[2]) : "无参数"}
							</span>
							<span>{factor[3] ?? ""}</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function FilterListGrid({ filters }: { filters?: unknown[] }) {
	if (!filters?.length) {
		return <p className="text-[11px] text-muted-foreground">暂无过滤因子</p>
	}

	return (
		<div className="min-w-0">
			<div className="grid grid-cols-4 gap-x-2 text-[10px] text-muted-foreground mb-1.5">
				<span>因子名称</span>
				<span>因子参数</span>
				<span>过滤条件</span>
				<span>排序方式</span>
			</div>
			<div className="space-y-1.5">
				{filters.map((item, index) => {
					if (!Array.isArray(item)) return null
					const filter = item as [string, unknown, string, boolean | undefined]
					return (
						<div
							key={index}
							className="grid grid-cols-4 gap-x-2 text-[11px] text-muted-foreground break-all leading-snug"
						>
							<span>{filter[0] ?? "--"}</span>
							<span className="font-mono">{JSON.stringify(filter[1])}</span>
							<span>{filter[2] ?? "--"}</span>
							<span>
								{filter[3] === undefined
									? "从小到大排序"
									: filter[3]
										? "从小到大排序"
										: "从大到小排序"}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function SelectFooter({ strategy }: { strategy: BasicSelectStgType }) {
	return (
		<div className="space-y-4">
			<div className="min-w-0">
				<div className="text-xs font-semibold mb-1.5 text-foreground">
					选股因子
				</div>
				<FactorListGrid factors={strategy.factor_list} />
			</div>
			<div className="min-w-0">
				<div className="text-xs font-semibold mb-1.5 text-foreground">
					过滤因子
				</div>
				<FilterListGrid filters={strategy.filter_list} />
			</div>
		</div>
	)
}

function SelectExclusiveGrid({ onSelect }: { onSelect: () => void }) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className="group block w-full text-left transition-opacity hover:opacity-90"
		>
			<div className="flex items-center gap-2 px-0 py-2.5">
				<Sparkles
					className="size-3.5 shrink-0 text-violet-500"
					strokeWidth={2}
				/>
				<span className={cn("text-[11px] font-medium", MEMBER_RAINBOW_TEXT)}>
					分享会专属功能
				</span>
				<span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400">
					这些功能对策略提升有多大？
				</span>
			</div>
			<div className="grid grid-cols-2 gap-x-4 gap-y-5 px-0 pb-1">
				{MEMBER_EXCLUSIVE_FIELDS.map((field) => (
					<div
						key={field.featureName}
						className="flex flex-col items-start gap-2 min-w-0"
					>
						<field.icon className="size-5 text-violet-500" strokeWidth={1.6} />
						<span
							className={cn(
								"text-xs font-semibold leading-snug",
								MEMBER_RAINBOW_TEXT,
							)}
						>
							{field.label}
						</span>
					</div>
				))}
			</div>
		</button>
	)
}

function TimingSpecGrid({
	timing,
}: {
	timing?: BasicTimingStgType["timing"]
}) {
	const params = timing?.params ?? {}
	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-5">
			<SpecCell
				icon={GitCompare}
				label="模式"
				value={formatRawParamValue(params.mode)}
			/>
			<SpecCell
				icon={Filter}
				label="零轴过滤"
				value={formatRawParamValue(params.zero_filter)}
			/>
			<SpecCell
				icon={BarChart3}
				label="最小柱值"
				value={formatRawParamValue(params.min_bar)}
			/>
			<SpecCell
				icon={AlarmClockCheck}
				label="确认天数"
				value={formatRawParamValue(params.confirm_n)}
			/>
		</div>
	)
}

function TimingFooter({ strategy }: { strategy: BasicTimingStgType }) {
	return (
		<div>
			<div className="text-xs font-semibold mb-1.5 text-foreground">
				选股因子
			</div>
			<FactorListGrid factors={strategy.timing?.factor_list} />
		</div>
	)
}

function RotationSpecGrid({ strategy }: { strategy: BasicRotationStgType }) {
	const rotation = strategy.rotation
	const params = rotation?.params ?? {}
	const codeCount = strategy.code_list?.length ?? 0
	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-5">
			<SpecCell
				icon={ListOrdered}
				label="最多持有"
				value={
					rotation?.max_select_num == null
						? "--"
						: String(rotation.max_select_num)
				}
			/>
			<SpecCell
				icon={Filter}
				label="全负空仓"
				value={formatRawParamValue(params.empty_when_all_negative)}
			/>
			<SpecCell
				icon={Repeat}
				label="并列处理"
				value={formatRawParamValue(params.tie_break)}
			/>
			<SpecCell
				icon={ChartPie}
				label="标的数量"
				value={codeCount > 0 ? `${codeCount} 个` : "--"}
			/>
		</div>
	)
}

function RotationFooter({ strategy }: { strategy: BasicRotationStgType }) {
	const rotation = strategy.rotation
	return (
		<div className="space-y-4">
			<div>
				<div className="text-xs font-semibold mb-1.5 text-foreground">
					选股因子
				</div>
				<FactorListGrid factors={rotation?.factor_list} />
			</div>
			{strategy.code_list?.length ? (
				<div>
					<div className="text-xs font-semibold mb-1.5 text-foreground">
						标的列表
					</div>
					<p className="text-[11px] text-muted-foreground break-all leading-relaxed">
						{strategy.code_list.join("、")}
					</p>
				</div>
			) : null}
		</div>
	)
}

function StrategyCardActions({
	onEditCapWeight,
	onDelete,
}: {
	onEditCapWeight: () => void
	onDelete: () => void
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 -mt-0.5 -mr-1 text-muted-foreground data-[state=open]:bg-muted"
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem onSelect={onEditCapWeight}>
					<Percent className="size-3.5" />
					修改资金占比
				</DropdownMenuItem>
				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					onSelect={onDelete}
				>
					<Trash2 className="size-3.5" />
					删除策略
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export function StrategyCard({
	strategy,
	index,
}: {
	strategy: BasicStgType
	index: number
}) {
	const type = getBasicStrategyType(strategy)
	const typeLabel = TYPE_LABELS[type]
	const { isAutoRocket } = useToggleAutoRealTrading()
	const { updateSelectStg } = useStrategyManager()
	const [promoOpen, setPromoOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [capWeightOpen, setCapWeightOpen] = useState(false)

	const capWeightPercent = Number(((strategy.cap_weight ?? 0) * 100).toFixed(2))

	const title = resolveSelectStrategyName(strategy)
	const rebalanceLabel = getRebalanceTimeLabel(
		strategy.rebalance_time ?? "close-open",
	)

	const subtitle =
		type === "select" && isBasicSelectStgType(strategy)
			? `选股数量 ${strategy.select_num ?? "--"} · 持仓周期 ${strategy.hold_period ?? "--"} · ${rebalanceLabel}`
			: type === "timing" && isBasicTimingStgType(strategy)
				? `${strategy.code ?? "--"} · ${strategy.code_type ?? "--"} · ${rebalanceLabel}`
				: isBasicRotationStgType(strategy)
					? `${strategy.code_type ?? "--"} · ${rebalanceLabel}`
					: rebalanceLabel

	const hasFooter = true

	return (
		<Card className="flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md px-5 py-4">
			{/* 区域一：标题 + 操作菜单 */}
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex items-baseline gap-2 min-w-0 pr-2">
						{isAutoRocket ? (
							<span className="shrink-0 text-base font-semibold tabular-nums text-foreground">
								{capWeightPercent}%
							</span>
						) : (
							<button
								type="button"
								onClick={() => setCapWeightOpen(true)}
								className="shrink-0 text-base font-semibold tabular-nums text-foreground transition-opacity hover:opacity-75"
							>
								{capWeightPercent}%
							</button>
						)}
						<StrategyNameDisplay
							name={title}
							nameClassName="text-base font-semibold tracking-tight leading-tight text-foreground"
						/>
					</div>
					<p className="text-xs text-muted-foreground">{subtitle}</p>
					<span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-[3px] text-xs font-medium text-foreground/70 dark:bg-white/10 dark:text-foreground/80">
						<span className={cn("size-2 rounded-full", TYPE_DOT_CLASS[type])} />
						{typeLabel}
					</span>
				</div>
				<div className="shrink-0">
					{isAutoRocket ? (
						<Badge variant="secondary" className="shrink-0">
							实盘中
						</Badge>
					) : (
						<StrategyCardActions
							onEditCapWeight={() => setCapWeightOpen(true)}
							onDelete={() => setDeleteOpen(true)}
						/>
					)}
				</div>
			</div>

			<Dialog open={capWeightOpen} onOpenChange={setCapWeightOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>修改资金占比</DialogTitle>
					</DialogHeader>
					<div className="flex items-center gap-2 py-1">
						<EditableNumberCell
							className="w-24 h-9 text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							value={capWeightPercent}
							onChange={async (newValue) => {
								try {
									await updateSelectStg(index, {
										...strategy,
										cap_weight: newValue / 100,
									} as SelectStgType)
								} catch {
									toast.error("保存策略失败")
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button onClick={() => setCapWeightOpen(false)}>完成</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DeleteStrategy
				hideTrigger
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				strategy={{ ...strategy, name: title } as SelectStgType}
				rowIndex={index}
				strategyType="select"
				onSuccess={() => {}}
			/>

			<div>
				<hr className={cn("my-4", DIVIDER)} />

				{/* 区域二：核心配置 */}
				<div>
					{isBasicSelectStgType(strategy) ? (
						<SelectFooter strategy={strategy} />
					) : isBasicTimingStgType(strategy) ? (
						<TimingSpecGrid timing={strategy.timing} />
					) : isBasicRotationStgType(strategy) ? (
						<RotationSpecGrid strategy={strategy} />
					) : null}
				</div>

				{hasFooter ? (
					<>
						<hr className={cn("my-4", DIVIDER)} />
						{/* 区域三：补充详情 */}
						<div>
							{isBasicSelectStgType(strategy) ? (
								<SelectExclusiveGrid onSelect={() => setPromoOpen(true)} />
							) : isBasicTimingStgType(strategy) ? (
								<TimingFooter strategy={strategy} />
							) : isBasicRotationStgType(strategy) ? (
								<RotationFooter strategy={strategy} />
							) : null}
						</div>
					</>
				) : null}
			</div>

			<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />
		</Card>
	)
}
