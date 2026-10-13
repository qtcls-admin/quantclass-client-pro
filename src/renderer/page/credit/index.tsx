import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/renderer/components/ui/card"
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/renderer/components/ui/pagination"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { H3 } from "@/renderer/components/ui/typography"
import {
	formatCreditBalance,
	useCreditBalance,
} from "@/renderer/hooks/useCreditBalance"
import { useCreditRecords } from "@/renderer/hooks/useCreditRecords"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
import type { CreditLedger } from "@/shared/types"
import { useAtomValue } from "jotai"
import { RefreshCw, Wallet, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const { openPaymentClientPortal } = window.electronAPI

const BASIC_CREDIT_PRODUCTS = [
	{
		name: "邢不行财务数据",
		full: "47.04",
		incremental: "0.588",
	},
	{
		name: "主要指数历史日线数据",
		full: "0.08",
		incremental: "0.001",
	},
	{
		name: "股票历史日线数据",
		full: "7.04",
		incremental: "0.088",
	},
	{
		name: "ETF基金日线数据",
		full: "7.04",
		incremental: "0.088",
	},
] as const

const CHANGE_TYPE_LABELS: Record<string, string> = {
	purchase: "购买",
	consumption: "消耗",
	gift: "赠送",
	manual: "手动处理",
	system: "自动处理",
	refund: "退款",
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

function getLedgerType(ledger: CreditLedger): string {
	return CHANGE_TYPE_LABELS[ledger.change_type] ?? ledger.change_type ?? "其他"
}

function formatRecordAmount(amount: number): string {
	const prefix = amount > 0 ? "+" : ""
	return `${prefix}${amount.toLocaleString()}`
}

function getVisiblePages(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

	const pages: (number | "ellipsis")[] = [1]
	if (current > 3) pages.push("ellipsis")

	const start = Math.max(2, current - 1)
	const end = Math.min(total - 1, current + 1)
	for (let i = start; i <= end; i++) pages.push(i)

	if (current < total - 2) pages.push("ellipsis")
	pages.push(total)
	return pages
}

export default function CreditPage() {
	const { isLoggedIn } = useAtomValue(userAtom)
	const { creditBalance, isFetchingCreditBalance, refetchCreditBalance } =
		useCreditBalance(isLoggedIn)
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(20)
	const {
		creditRecords,
		isLoadingCreditRecords,
		isFetchingCreditRecords,
		refetchCreditRecords,
	} = useCreditRecords(isLoggedIn, page, pageSize)
	const [isOpeningPaymentPortal, setIsOpeningPaymentPortal] = useState(false)

	const ledgers = creditRecords?.ledgers ?? []
	const total = creditRecords?.total ?? 0
	const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

	useEffect(() => {
		if (page > totalPages) setPage(totalPages)
	}, [page, totalPages])

	const handleRefreshBalance = async () => {
		await refetchCreditBalance()
		toast.success("余额已刷新")
	}

	const handleRefreshRecords = async () => {
		await refetchCreditRecords()
		toast.success("积分流水已刷新")
	}

	const handlePageSizeChange = (value: string) => {
		setPageSize(Number(value))
		setPage(1)
	}

	const handleOpenPaymentPortal = async () => {
		setIsOpeningPaymentPortal(true)
		try {
			const result = await openPaymentClientPortal()
			if (!result.success) {
				toast.error(result.message || "打开支付页面失败")
			}
		} catch {
			toast.error("打开支付页面失败")
		} finally {
			setIsOpeningPaymentPortal(false)
		}
	}

	return (
		<div className="flex min-h-full flex-col gap-4 py-3">
			<div className="flex flex-col gap-1">
				<H3>我的积分</H3>
				<p className="text-muted-foreground">查看当前积分余额与积分变动流水</p>
			</div>

			<Card className="shadow-none">
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
					<div className="flex items-center gap-3">
						<Zap className="size-5 text-blue-600 dark:text-blue-400" />
						<div>
							<CardTitle className="text-base">当前积分余额</CardTitle>
							<CardDescription>可用于数据更新等积分消耗任务</CardDescription>
						</div>
					</div>
					<Button
						size="sm"
						disabled={!isLoggedIn || isOpeningPaymentPortal}
						onClick={handleOpenPaymentPortal}
					>
						{isOpeningPaymentPortal ? (
							<RefreshCw className="mr-2 size-4 animate-spin" />
						) : (
							<Wallet className="mr-2 size-4" />
						)}
						充值积分
					</Button>
				</CardHeader>
				<CardContent className="pb-4">
					<div className="flex items-center gap-2">
						<div className="inline-flex items-center gap-2.5 rounded-full border bg-muted/40 px-5 py-2.5">
							<span className="text-4xl font-bold tabular-nums leading-none tracking-tight">
								{formatCreditBalance(creditBalance?.credit_balance)}
							</span>
							<span className="text-sm text-muted-foreground">积分</span>
						</div>
						<Button
							variant="outline"
							size="icon"
							className="size-12 shrink-0 rounded-full shadow-none"
							disabled={!isLoggedIn || isFetchingCreditBalance}
							title="刷新余额"
							onClick={handleRefreshBalance}
						>
							<RefreshCw
								size={20}
								className={cn(
									"text-muted-foreground",
									isFetchingCreditBalance && "animate-spin",
								)}
							/>
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">积分消耗规则</CardTitle>
					<CardDescription>
						在数据页对单个产品执行更新，或开启自动更新时，均会消耗积分。下表为单次全量恢复、单次增量更新积分的大致消耗。
					</CardDescription>
				</CardHeader>
				<CardContent className="pb-4">
					<div className="overflow-hidden rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>数据产品</TableHead>
									<TableHead className="text-right">全量恢复（约）</TableHead>
									<TableHead className="text-right">增量更新（约）</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{BASIC_CREDIT_PRODUCTS.map((product) => (
									<TableRow key={product.name}>
										<TableCell className="font-medium">
											{product.name}
										</TableCell>
										<TableCell className="text-right font-mono">
											{product.full}
										</TableCell>
										<TableCell className="text-right font-mono">
											{product.incremental}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			<Card className="flex min-h-[420px] flex-1 flex-col shadow-none">
				<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
					<div>
						<CardTitle className="text-base">积分使用 / 购买记录</CardTitle>
						<CardDescription>查看最近的积分消耗、充值记录</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={!isLoggedIn || isFetchingCreditRecords}
						onClick={handleRefreshRecords}
					>
						<RefreshCw
							className={cn(
								"mr-2 size-4",
								isFetchingCreditRecords && "animate-spin",
							)}
						/>
						刷新
					</Button>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-0">
					<div className="min-h-0 flex-1 overflow-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>类型</TableHead>
									<TableHead>描述</TableHead>
									<TableHead className="text-right">变动额度</TableHead>
									<TableHead>订单号</TableHead>
									<TableHead className="text-right">时间</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoadingCreditRecords ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-28 text-center text-muted-foreground"
										>
											加载中...
										</TableCell>
									</TableRow>
								) : ledgers.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-28 text-center text-muted-foreground"
										>
											暂无积分记录
										</TableCell>
									</TableRow>
								) : (
									ledgers.map((ledger) => (
										<TableRow key={ledger.uuid}>
											<TableCell>
												<Badge variant="outline">{getLedgerType(ledger)}</Badge>
											</TableCell>
											<TableCell>{ledger.reason || "--"}</TableCell>
											<TableCell
												className={cn(
													"text-right font-medium",
													ledger.amount > 0
														? "text-emerald-600 dark:text-emerald-400"
														: ledger.amount < 0
															? "text-red-600 dark:text-red-400"
															: "",
												)}
											>
												{formatRecordAmount(ledger.amount)}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{ledger.order_id || "--"}
											</TableCell>
											<TableCell className="text-right whitespace-nowrap text-muted-foreground">
												{ledger.create_time || "--"}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{total > 0 ? (
						<div className="flex shrink-0 flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
								<span>共 {total} 条</span>
								<div className="flex items-center gap-2">
									<span>每页</span>
									<Select
										value={`${pageSize}`}
										onValueChange={handlePageSizeChange}
									>
										<SelectTrigger className="h-8 w-[70px] text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent side="top">
											{PAGE_SIZE_OPTIONS.map((size) => (
												<SelectItem
													key={size}
													value={`${size}`}
													className="hover:cursor-pointer"
												>
													{size}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<span>行</span>
								</div>
							</div>
							<Pagination className="mx-0 w-full justify-center sm:w-auto">
								<PaginationContent className="flex-wrap">
									<PaginationItem>
										<PaginationPrevious
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page <= 1}
											className={
												page <= 1 ? "pointer-events-none opacity-50" : ""
											}
										/>
									</PaginationItem>
									{getVisiblePages(page, totalPages).map((p, i) =>
										p === "ellipsis" ? (
											<PaginationItem key={`ellipsis-${i}`}>
												<PaginationEllipsis />
											</PaginationItem>
										) : (
											<PaginationItem key={p}>
												<PaginationLink
													isActive={p === page}
													onClick={() => setPage(p)}
												>
													{p}
												</PaginationLink>
											</PaginationItem>
										),
									)}
									<PaginationItem>
										<PaginationNext
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page >= totalPages}
											className={
												page >= totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
