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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input as InputUI } from "@/renderer/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { cn } from "@/renderer/lib/utils"
import { ArrowDown, ArrowUp, Inbox, Maximize2 } from "lucide-react"
import { Fragment, type ReactNode, useState } from "react"

interface StockTimingRule {
	rolling_n?: number
	direction?: string
	limit?: number
}

interface StockTimingItem {
	name?: string
	factor_list?: Array<[string, boolean, unknown, string | number | null]>
	params?: string | number | null
	weight?: number | string | null
}

interface StockTimingRegion {
	filter_list?: Array<[string, unknown, string, boolean | undefined]>
	timing_list?: StockTimingItem[]
	rules?: Record<string, StockTimingRule>
}

interface StockTimingRegionsProps {
	value?: Record<string, StockTimingRegion>
}

export function StockTimingRegions({ value }: StockTimingRegionsProps) {
	const regions = Object.entries(value ?? {})

	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
			{regions.map(([name, region]) => (
				<RegionCard
					key={name}
					name={name}
					region={region && typeof region === "object" ? region : {}}
				/>
			))}
		</div>
	)
}

function RegionCard({
	name,
	region,
}: {
	name: string
	region: StockTimingRegion
}) {
	const [isDetailOpen, setIsDetailOpen] = useState(false)
	const timingList = region.timing_list ?? []
	const filterList = region.filter_list ?? []
	const rules = Object.entries(region.rules ?? {})

	return (
		<div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
			<div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
				<span className="truncate text-sm font-semibold">{name}</span>
				<button
					type="button"
					title="查看详情"
					className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onClick={() => setIsDetailOpen(true)}
				>
					<Maximize2 className="size-4" />
				</button>
			</div>

			<div className="flex flex-col gap-2.5 p-3">
				<section className="space-y-1.5">
					<SectionTitle
						dotClassName="bg-sky-500"
						label="个股择时"
						count={timingList.length}
					/>
					{timingList.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{timingList.map((item, index) => (
								<TimingChip key={index} name={item.name} />
							))}
						</div>
					) : (
						<EmptyText />
					)}
				</section>

				<section className="space-y-1.5">
					<SectionTitle
						dotClassName="bg-blue-500"
						label="过滤因子"
						count={filterList.length}
					/>
					{filterList.length > 0 ? (
						<div className="space-y-1">
							{filterList.map((filter, index) => (
								<div key={index} className="flex items-center gap-1.5 text-xs">
									<span className="min-w-0 truncate">{filter[0]}</span>
									<ConditionBadge condition={filter[2]} />
									<SortIcon isAscending={filter[3] !== false} />
								</div>
							))}
						</div>
					) : (
						<EmptyText />
					)}
				</section>

				<section className="space-y-1.5">
					<SectionTitle
						dotClassName="bg-violet-500"
						label="规则"
						count={rules.length}
					/>
					{rules.length > 0 ? (
						<div className="space-y-1">
							{rules.map(([target, rule]) => (
								<div key={target} className="flex items-center gap-1.5 text-xs">
									<span className="text-muted-foreground">→</span>
									<span className="min-w-0 truncate">{target}</span>
									<DirectionBadge direction={rule?.direction} />
									<span className="shrink-0 text-muted-foreground">
										窗口 {rule?.rolling_n ?? "-"}
									</span>
								</div>
							))}
						</div>
					) : (
						<EmptyText />
					)}
				</section>
			</div>

			<RegionDetailDialog
				name={name}
				region={region}
				isOpen={isDetailOpen}
				onOpenChange={setIsDetailOpen}
			/>
		</div>
	)
}

function RegionDetailDialog({
	name,
	region,
	isOpen,
	onOpenChange,
}: {
	name: string
	region: StockTimingRegion
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}) {
	const [expandedTimingIndex, setExpandedTimingIndex] = useState<number | null>(
		null,
	)
	const timingList = region.timing_list ?? []
	const filterList = region.filter_list ?? []
	const rules = Object.entries(region.rules ?? {})

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl gap-0 p-0">
				<DialogHeader className="px-5 py-4">
					<DialogTitle className="text-base">{name}</DialogTitle>
				</DialogHeader>

				<div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto px-5 pb-5">
					<DetailSection
						dotClassName="bg-sky-500"
						label="个股择时列表"
						count={timingList.length}
					>
						<Table containerClassname="rounded-lg border overflow-hidden">
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40">
									<DetailHead className="w-14">序号</DetailHead>
									<DetailHead>个股择时名称</DetailHead>
									<DetailHead>参数</DetailHead>
									<DetailHead>权重</DetailHead>
									<DetailHead>依赖的因子列表</DetailHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{timingList.length > 0 ? (
									timingList.map((item, index) => {
										const isExpanded = expandedTimingIndex === index
										return (
											<Fragment key={index}>
												<TableRow>
													<DetailCell>{index + 1}</DetailCell>
													<DetailCell>
														<TimingChip name={item.name} />
													</DetailCell>
													<DetailCell className="font-mono">
														{formatValue(item.params)}
													</DetailCell>
													<DetailCell>{formatValue(item.weight)}</DetailCell>
													<DetailCell>
														<button
															type="button"
															className="text-blue-600 hover:underline dark:text-blue-400"
															onClick={() =>
																setExpandedTimingIndex(
																	isExpanded ? null : index,
																)
															}
														>
															{isExpanded ? "收起" : "查看"}
														</button>
													</DetailCell>
												</TableRow>
												{isExpanded && (
													<TableRow className="hover:bg-transparent">
														<TableCell colSpan={5} className="bg-muted/30 p-3">
															<TimingFactorTable
																factorList={item.factor_list}
															/>
														</TableCell>
													</TableRow>
												)}
											</Fragment>
										)
									})
								) : (
									<EmptyRow colSpan={5} text="暂无个股择时" />
								)}
							</TableBody>
						</Table>
					</DetailSection>

					<DetailSection
						dotClassName="bg-blue-500"
						label="过滤因子列表"
						count={filterList.length}
					>
						<Table containerClassname="rounded-lg border overflow-hidden">
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40">
									<DetailHead className="w-14">序号</DetailHead>
									<DetailHead>过滤因子</DetailHead>
									<DetailHead>因子参数</DetailHead>
									<DetailHead>因子使用条件</DetailHead>
									<DetailHead>排序方式</DetailHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filterList.length > 0 ? (
									filterList.map((filter, index) => {
										const isAscending = filter[3] !== false
										return (
											<TableRow key={index}>
												<DetailCell>{index + 1}</DetailCell>
												<DetailCell>{filter[0]}</DetailCell>
												<DetailCell className="font-mono">
													{JSON.stringify(filter[1])}
												</DetailCell>
												<DetailCell>
													<ConditionBadge condition={filter[2]} />
												</DetailCell>
												<DetailCell>
													<span className="inline-flex items-center gap-1">
														{isAscending ? "升序" : "降序"}
														<SortIcon isAscending={isAscending} />
													</span>
												</DetailCell>
											</TableRow>
										)
									})
								) : (
									<EmptyRow colSpan={5} text="暂无过滤因子" />
								)}
							</TableBody>
						</Table>
					</DetailSection>

					<DetailSection
						dotClassName="bg-violet-500"
						label="规则"
						count={rules.length}
					>
						<Table containerClassname="rounded-lg border overflow-hidden">
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40">
									<DetailHead>目标分区</DetailHead>
									<DetailHead>窗口长度</DetailHead>
									<DetailHead>买卖方向</DetailHead>
									<DetailHead>调仓步长</DetailHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rules.length > 0 ? (
									rules.map(([target, rule]) => (
										<TableRow key={target}>
											<DetailCell>{target}</DetailCell>
											<DetailCell className="font-mono">
												{formatValue(rule?.rolling_n)}
											</DetailCell>
											<DetailCell>
												<DirectionBadge direction={rule?.direction} />
											</DetailCell>
											<DetailCell className="font-mono">
												{formatValue(rule?.limit)}
											</DetailCell>
										</TableRow>
									))
								) : (
									<EmptyRow colSpan={4} text="暂无规则" />
								)}
							</TableBody>
						</Table>
					</DetailSection>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function TimingFactorTable({
	factorList,
}: {
	factorList?: StockTimingItem["factor_list"]
}) {
	if (!factorList?.length) {
		return (
			<div className="text-muted-foreground ml-2 text-xs">
				暂无依赖因子，请先进行配置
			</div>
		)
	}

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
				<span>因子名称</span>
				<span>排序方式</span>
				<span>因子参数</span>
				<span>因子计算参数（比如权重）</span>
			</div>
			<div className="space-y-2">
				{factorList.map((factor, idx) => (
					<div key={idx} className="grid grid-cols-4 gap-2">
						<InputUI
							value={factor[0]}
							className="text-muted-foreground text-xs"
							readOnly
						/>
						<InputUI
							value={factor[1] ? "从小到大排序" : "从大到小排序"}
							className="text-muted-foreground text-xs"
							readOnly
						/>
						<InputUI
							value={factor[2] !== null ? JSON.stringify(factor[2]) : "无参数"}
							className="text-muted-foreground text-xs font-mono"
							readOnly
						/>
						<InputUI
							value={factor[3] ?? ""}
							className="text-muted-foreground text-xs"
							readOnly
						/>
					</div>
				))}
			</div>
		</div>
	)
}

function SectionTitle({
	dotClassName,
	label,
	count,
}: {
	dotClassName: string
	label: string
	count: number
}) {
	return (
		<div className="flex items-center gap-1.5 text-xs">
			<span className={cn("size-1.5 rounded-full", dotClassName)} />
			<span className="text-muted-foreground">{label}</span>
			<span className="text-muted-foreground">{count}</span>
		</div>
	)
}

function DetailSection({
	dotClassName,
	label,
	count,
	children,
}: {
	dotClassName: string
	label: string
	count: number
	children: ReactNode
}) {
	return (
		<section className="space-y-2">
			<div className="flex items-center gap-2 text-sm font-medium">
				<span className={cn("size-1.5 rounded-full", dotClassName)} />
				<span>{label}</span>
				<span className="rounded bg-muted px-1.5 text-xs font-normal text-muted-foreground">
					{count}
				</span>
			</div>
			{children}
		</section>
	)
}

function DetailHead({
	className,
	children,
}: {
	className?: string
	children: ReactNode
}) {
	return (
		<TableHead className={cn("h-9 bg-transparent text-xs", className)}>
			{children}
		</TableHead>
	)
}

function DetailCell({
	className,
	children,
}: {
	className?: string
	children: ReactNode
}) {
	return (
		<TableCell className={cn("px-2 py-2.5 text-xs", className)}>
			{children}
		</TableCell>
	)
}

function EmptyText() {
	return <p className="text-xs text-muted-foreground">暂无</p>
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={colSpan} className="py-6">
				<div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
					<Inbox className="size-3.5" />
					{text}
				</div>
			</TableCell>
		</TableRow>
	)
}

function TimingChip({ name }: { name?: string }) {
	return (
		<span className="inline-block max-w-full truncate rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
			{name || "未命名"}
		</span>
	)
}

function ConditionBadge({ condition }: { condition?: string }) {
	return (
		<span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-600 dark:bg-blue-950 dark:text-blue-300">
			{condition || "-"}
		</span>
	)
}

function SortIcon({ isAscending }: { isAscending: boolean }) {
	const Icon = isAscending ? ArrowUp : ArrowDown
	return <Icon className="size-3.5 shrink-0 text-muted-foreground" />
}

function DirectionBadge({ direction }: { direction?: string }) {
	if (!direction) return null
	const directionStyle = DIRECTION_STYLES[direction]
	return (
		<span
			className={cn(
				"shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
				directionStyle?.className ?? "bg-muted text-muted-foreground",
			)}
		>
			{directionStyle?.label ?? direction}
		</span>
	)
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined || value === "") return "无"
	if (typeof value === "string" || typeof value === "number")
		return String(value)
	return JSON.stringify(value)
}

const DIRECTION_STYLES: Record<string, { label: string; className: string }> = {
		buy: {
			label: "买入",
			className:
				"bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
		},
	sell: {
		label: "卖出",
		className: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
	},
}
