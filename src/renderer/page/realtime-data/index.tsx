/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { AcceleratedDataSourceConfirmDialog } from "@/renderer/components/AcceleratedDataSourceConfirmDialog"
import { DeleteMinDataTodayConfirmDialog } from "@/renderer/components/DeleteMinDataTodayConfirmDialog"
import { MinDataExecConfirmDialog } from "@/renderer/components/MinDataExecConfirmDialog"
import { MinDataTaskTable } from "@/renderer/components/MinDataTaskTable"
import { SelectTabs } from "@/renderer/components/select-tabs"
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/renderer/components/ui/accordion"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { Label } from "@/renderer/components/ui/label"
import { Switch } from "@/renderer/components/ui/switch"
import { useMinDataSchedule, useToggleAutoRealTrading } from "@/renderer/hooks"
import { useSettings } from "@/renderer/hooks/useSettings"
import {
	isMinDataUpdatingAtom,
	minDataModeAtom,
	realConfigEditModalAtom,
} from "@/renderer/store"
import {
	planXConfigAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { getBrokerNameByAccountId } from "@/renderer/utils/broker"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { CircleHelp, Play, RefreshCw, Settings, Trash2 } from "lucide-react"
import { type FC, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const {
	execMinData,
	deleteMinDataToday,
	onMinDataScheduleStatus,
	removeMinDataScheduleStatusListener,
} = window.electronAPI

const REALTIME_DATA_UPDATE_NOTES = (
	<div className="space-y-3 text-sm font-medium">
		<div>
			<p>更新规则：交易时段内每 5 分钟执行一次。</p>
			<p className="text-muted-foreground">
				· 上午：9:30 - 11:30
				<br />· 下午：13:00 - 15:00
				<br />· 周一至周五
			</p>
		</div>
		<div>
			<p>性能模式：</p>
			<p className="text-muted-foreground">
				· 极速模式：约 1 分钟左右，速度快
				<br />· 稳定模式：约 3 分钟左右，更稳定
			</p>
		</div>
	</div>
)

const REALTIME_DATA_FAQ = [
	{
		trigger: "QMT 需要先登录吗？",
		content:
			"需要。获取分钟级 K 线数据需要连接 QMT，请确保 QMT 客户端已登录并正常运行。",
	},
	{
		trigger: "数据获取失败怎么办？",
		content:
			"1. 检查实盘配置中 QMT 账户号和安装路径是否正确；2. 检查 QMT 客户端是否已登录；3. 检查网络是否正常。4. 重启 QMT 客户端",
	},
]

const RealtimeData: FC = () => {
	const [mode, setMode] = useAtom(minDataModeAtom)
	const isMinDataUpdating = useAtomValue(isMinDataUpdatingAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const planXConfig = useAtomValue(planXConfigAtom)
	const setRealConfigEditModal = useSetAtom(realConfigEditModalAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { startMinDataSchedule, stopMinDataSchedule, syncMinDataSchedule } =
		useMinDataSchedule()
	const { settings, updateSettings } = useSettings()
	const [isExecuting, setIsExecuting] = useState(false)
	const [execConfirmOpen, setExecConfirmOpen] = useState(false)
	const [acceleratedConfirmOpen, setAcceleratedConfirmOpen] = useState(false)
	const [deleteTodayConfirmOpen, setDeleteTodayConfirmOpen] = useState(false)
	const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0)

	const enableEtfMinData = settings.enable_etf_min_data ?? false

	useEffect(() => {
		onMinDataScheduleStatus((_event, status) => {
			if (status.type === "skipped") {
				toast.info("自动更新：Fuel 内核正忙，跳过本轮")
			} else if (status.type === "executing") {
				setIsExecuting(true)
				toast.info(
					enableEtfMinData
						? "自动更新：正在获取准确数据（含 ETF）..."
						: "自动更新：正在获取准确数据...",
				)
			} else if (status.type === "done") {
				setIsExecuting(false)
				toast.success(
					enableEtfMinData
						? "自动更新：本轮数据获取完成（含 ETF）"
						: "自动更新：本轮数据获取完成",
				)
			}
		})
		return () => removeMinDataScheduleStatusListener()
	}, [enableEtfMinData])

	const isPlanA = realMarketConfig?.qmt_mode === "planA"
	const qmtAccountId = isPlanA
		? realMarketConfig?.account_id
		: planXConfig.account_id
	const qmtPath = isPlanA ? realMarketConfig?.qmt_path : planXConfig.qmt_path
	const exportedDir = planXConfig.exported_dir
	const isQmtConfigured = isPlanA
		? !!qmtAccountId?.trim() && !!qmtPath?.trim()
		: !!qmtAccountId?.trim() && !!qmtPath?.trim() && !!exportedDir?.trim()

	const brokerName = getBrokerNameByAccountId(qmtAccountId ?? "")
	const brokerDisplay = brokerName || "未知"
	const isCiccBroker = brokerName === "中金"

	const handleStartAutoUpdate = useCallback(async () => {
		await startMinDataSchedule()
	}, [startMinDataSchedule])

	const handleStopAutoUpdate = useCallback(async () => {
		await stopMinDataSchedule()
		isAutoRocket && (await handleToggleAutoRocket(false))
	}, [stopMinDataSchedule, isAutoRocket, handleToggleAutoRocket])

	const handleExecAccurate = useCallback(async () => {
		setIsExecuting(true)
		try {
			const result = await execMinData(mode)
			if (result.code === 200) {
				toast.success(result.message)
			} else if (result.code === 300) {
				toast.warning(result.message)
			} else {
				toast.error(result.message)
			}
		} catch (error) {
			toast.error("执行失败")
		} finally {
			setIsExecuting(false)
		}
	}, [mode])

	const handleExecConfirmClick = useCallback(() => {
		if (!isQmtConfigured) {
			toast.warning(
				isPlanA
					? "QMT 未配置，请先在实盘配置中填写 QMT 账户号和安装路径"
					: "QMT 未配置，请先在实盘配置中填写账户号、安装路径和导出路径",
			)
			return
		}
		setExecConfirmOpen(true)
	}, [isQmtConfigured, isPlanA])

	const handleConfirmExec = useCallback(() => {
		setExecConfirmOpen(false)
		handleExecAccurate()
	}, [handleExecAccurate])

	const handleAcceleratedDataSourceChange = useCallback(
		(checked: boolean) => {
			if (checked) {
				setAcceleratedConfirmOpen(true)
				return
			}
			updateSettings({ accelerated_data_source: false })
			toast.success("加速数据源已关闭")
		},
		[updateSettings],
	)

	const handleConfirmAcceleratedDataSource = useCallback(() => {
		setAcceleratedConfirmOpen(false)
		updateSettings({ accelerated_data_source: true })
		toast.success("加速数据源已启用")
	}, [updateSettings])

	const handleEtfMinDataChange = useCallback(
		(checked: boolean) => {
			updateSettings({ enable_etf_min_data: checked })
			toast.success(checked ? "ETF 实时数据已启用" : "ETF 实时数据已关闭")
		},
		[updateSettings],
	)

	const handleConfirmDeleteToday = useCallback(async () => {
		const result = await deleteMinDataToday()
		if (result.success) {
			toast.success(result.message ?? "今日实时数据已删除")
			setDeleteTodayConfirmOpen(false)
			setTableRefreshTrigger((n) => n + 1)
		} else {
			toast.error(result.message ?? "删除今日实时数据失败")
		}
	}, [])

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<p className="font-bold text-base">
				获取 QMT 分钟级 K 线数据。
				{isMinDataUpdating
					? "自动更新中"
					: "点击启动自动更新数据，在交易时段内自动更新数据"}
			</p>

			<div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="font-medium">QMT 账户号：</span>
							<span className="text-muted-foreground">
								{qmtAccountId?.trim() || "未配置"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-medium">QMT 安装路径：</span>
							<span className="truncate text-muted-foreground">
								{qmtPath?.trim() || "未配置"}
							</span>
						</div>
						{!isPlanA && (
							<div className="flex items-center gap-2">
								<span className="font-medium">QMT 导出路径：</span>
								<span className="truncate text-muted-foreground">
									{exportedDir?.trim() || "未配置"}
								</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<span className="font-medium">券商：</span>
							{isCiccBroker ? (
								<span className="text-yellow-600 dark:text-yellow-500 font-medium">
									{brokerDisplay}
									<span className="text-muted-foreground font-normal">
										（已过滤北交所）
									</span>
								</span>
							) : (
								<span className="text-muted-foreground">{brokerDisplay}</span>
							)}
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="shrink-0"
						onClick={() => setRealConfigEditModal(true)}
					>
						<Settings className="mr-1.5 h-3.5 w-3.5" />
						实盘配置
					</Button>
				</div>
				{!isQmtConfigured && (
					<p className="mt-2 text-amber-600 dark:text-amber-500">
						{isPlanA
							? "执行前请先在实盘配置中填写 QMT 账户号和 QMT 安装路径，否则数据获取将失败。"
							: "执行前请先在实盘配置中填写账户号、安装路径和导出路径，否则数据获取将失败。"}
					</p>
				)}
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div>
						{isMinDataUpdating ? (
							<ButtonTooltip content="停止自动更新数据">
								<Button
									variant="success"
									size="icon"
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStopAutoUpdate}
								>
									<RefreshCw size={16} className="animate-spin" />
								</Button>
							</ButtonTooltip>
						) : (
							<ButtonTooltip content="启动自动更新数据">
								<Button
									className="hover:cursor-pointer w-12 h-10 flex items-center justify-center"
									onClick={handleStartAutoUpdate}
								>
									<Play className="h-5 w-5" />
								</Button>
							</ButtonTooltip>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Switch
							id="accelerated-data-source"
							checked={settings.accelerated_data_source ?? false}
							onCheckedChange={handleAcceleratedDataSourceChange}
						/>
						<Label
							htmlFor="accelerated-data-source"
							className="text-sm font-medium cursor-pointer"
						>
							启用加速数据源
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Switch
							id="enable-etf-min-data"
							checked={enableEtfMinData}
							onCheckedChange={handleEtfMinDataChange}
						/>
						<Label
							htmlFor="enable-etf-min-data"
							className="text-sm font-medium cursor-pointer"
						>
							启用 ETF 实时数据
						</Label>
					</div>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="shrink-0 text-destructive hover:text-destructive"
					onClick={() => setDeleteTodayConfirmOpen(true)}
				>
					<Trash2 className="mr-1.5 h-3.5 w-3.5" />
					删除今日实时数据
				</Button>
			</div>

			<MinDataTaskTable
				title="准确 QMT 数据"
				description="获取 5 分钟准确 K 线数据，可选极速模式或稳定模式"
				isExecuting={isExecuting}
				onExecute={handleExecConfirmClick}
				mode={mode}
				refreshTrigger={tableRefreshTrigger}
			>
				<div className="flex items-center gap-2">
					<span className="font-semibold whitespace-nowrap flex items-center gap-1">
						性能模式
						<ButtonTooltip
							content={
								<div className="space-y-1">
									<div>极速模式：约 1 分钟左右，速度快</div>
									<div>稳定模式：约 3 分钟左右，更稳定</div>
								</div>
							}
						>
							<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
						</ButtonTooltip>
					</span>
					<SelectTabs
						tabs={[
							{ label: "极速", value: "fast" },
							{ label: "稳定", value: "stable" },
						]}
						defaultValue={mode}
						onValueChange={(value) => {
							setMode(value as "fast" | "stable")
							toast.success(`已切换为${value === "fast" ? "极速" : "稳定"}模式`)
							if (isMinDataUpdating) {
								void syncMinDataSchedule({
									mode: value as "fast" | "stable",
								})
							}
						}}
					/>
				</div>
			</MinDataTaskTable>

			<Accordion
				type="multiple"
				defaultValue={["update-notes", "faq"]}
				className="w-full"
			>
				<AccordionItem value="update-notes">
					<AccordionTrigger>自动更新说明</AccordionTrigger>
					<AccordionContent>{REALTIME_DATA_UPDATE_NOTES}</AccordionContent>
				</AccordionItem>
				<AccordionItem value="faq">
					<AccordionTrigger>常见问题</AccordionTrigger>
					<AccordionContent>
						<div className="space-y-3 text-sm">
							{REALTIME_DATA_FAQ.map((item) => (
								<div key={item.trigger}>
									<p className="font-medium">{item.trigger}</p>
									<p className="text-muted-foreground">{item.content}</p>
								</div>
							))}
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<MinDataExecConfirmDialog
				open={execConfirmOpen}
				onOpenChange={setExecConfirmOpen}
				onConfirm={handleConfirmExec}
				enableEtfMinData={enableEtfMinData}
			/>

			<AcceleratedDataSourceConfirmDialog
				open={acceleratedConfirmOpen}
				onOpenChange={setAcceleratedConfirmOpen}
				onConfirm={handleConfirmAcceleratedDataSource}
			/>

			<DeleteMinDataTodayConfirmDialog
				open={deleteTodayConfirmOpen}
				onOpenChange={setDeleteTodayConfirmOpen}
				onConfirm={handleConfirmDeleteToday}
			/>
		</div>
	)
}

export default RealtimeData
