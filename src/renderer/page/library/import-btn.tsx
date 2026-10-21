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
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { DialogFooter, DialogHeader } from "@/renderer/components/ui/dialog"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import { backtestConfigAtom, reTimingAtom } from "@/renderer/store/storage"
import type { SelectStgType } from "@/renderer/types/strategy"
import { openRealTradingFolder } from "@/renderer/utils"
import { useMutation } from "@tanstack/react-query"
import { useSetAtom } from "jotai"
import { isArray } from "lodash-es"
import {
	BadgePlus,
	Clock,
	Eraser,
	FolderDown,
	FolderOpen,
	Loader2,
	OctagonAlert,
	Scale,
	ShieldCheck,
	TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import RebTimeConfigModal from "../../components/RebTimeConfigModal"
import TradeCtrlBtn from "../../components/trade-ctrl-btn"

export default function StgImportButton() {
	const { selectFile, setStoreValue, importSelectStock } = window.electronAPI

	const [pending, setPending] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [rebTimeConfigOpen, setRebTimeConfigOpen] = useState(false)

	const setBacktestConfig = useSetAtom(backtestConfigAtom)
	const setReTiming = useSetAtom(reTimingAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { resetSelectStgList, addSelectStgList } = useStrategyManager()
	const { mutateAsync: importLibraryDir, isPending } = useMutation({
		mutationKey: ["import-library"],
		mutationFn: async (configFilePath: string) =>
			await importSelectStock(configFilePath),
		onSuccess: async (data) => {
			if (!data.success) {
				toast.dismiss()
				if (data.readonlyFiles?.length) {
					const preview = data.readonlyFiles.slice(0, 12).join("\n")
					const suffix =
						data.readonlyFiles.length > 12
							? `\n…等共 ${data.readonlyFiles.length} 个只读文件`
							: ""
					toast.error("导入失败：以下文件为只读", {
						description: preview + suffix,
						duration: 12_000,
					})
				} else {
					toast.error(data.error ?? "导入失败")
				}
				return
			}
			const {
				configJson: strategyListStr = "",
				backtestName = "默认策略",
				reTiming = null,
			} = data
			const strategyList = JSON.parse(strategyListStr)

			if (isArray(strategyList)) {
				const strategyListWithCap0 = strategyList.map((item) => ({
					...item,
					cap_weight: 0,
					remark_name: item.remark_name ?? "",
				}))

				// -- Set to config json store
				setStoreValue("select_stock.backtest_name", backtestName)
				// -- 保存 re_timing（资金曲线再择时）
				const reTimingObj = reTiming ? JSON.parse(reTiming) : null
				setStoreValue("select_stock.re_timing", reTimingObj)
				setReTiming(reTimingObj)
				// -- Set to render local storage
				setBacktestConfig((p) => ({
					...p,
					backtest_name: backtestName,
				}))
				addSelectStgList(strategyListWithCap0 as SelectStgType[])
			}
			setImportOpen(false)
			toast.success("导入成功")
		},
		onError: () => {
			toast.dismiss()
			toast.error("导入失败")
		},
	})

	return (
		<>
			{isAutoRocket && <TradeCtrlBtn size="sm" className="h-8 lg:flex" />}
			<ButtonTooltip content="请选择策略代码下的 config 文件">
				<Button
					size="sm"
					variant="outline"
					className="h-8 lg:flex"
					disabled={isAutoRocket}
					onClick={() => setImportOpen(true)}
				>
					<FolderDown className="size-4 mr-2" />
					添加策略
				</Button>
			</ButtonTooltip>

			<ButtonTooltip content="清空当前策略库所有策略">
				<Button
					onClick={() => setDeleteOpen(true)}
					size="sm"
					variant="outline"
					disabled={isAutoRocket}
					className="h-8 hover:bg-destructive/90 hover:text-destructive-foreground text-foreground lg:flex"
				>
					<Eraser className="size-4 mr-2" />
					清空选股策略
				</Button>
			</ButtonTooltip>
			<ButtonTooltip
				content="打开存放“策略库”和“因子库”的文件夹，方便查看、确认已导入的策略信息"
				delayDuration={100}
			>
				<Button
					onClick={async () => {
						setPending(true)
						await openRealTradingFolder()
						setTimeout(() => setPending(false), 750)
					}}
					size="sm"
					disabled={pending}
					variant="outline"
					className="h-8 gap-1 lg:flex"
				>
					{pending ? (
						<Loader2 size={16} className="animate-spin" />
					) : (
						<FolderOpen size={16} />
					)}
					打开文件夹
				</Button>
			</ButtonTooltip>
			<Button
				size="sm"
				variant="outline"
				className="h-8 lg:flex"
				onClick={() => setRebTimeConfigOpen(true)}
			>
				<Clock className="size-4 mr-2" />
				换仓时间配置
			</Button>
			<RebTimeConfigModal
				open={rebTimeConfigOpen}
				onOpenChange={setRebTimeConfigOpen}
			/>
			<Dialog open={importOpen} onOpenChange={setImportOpen}>
				<DialogContent className="p-4">
					<DialogHeader>
						<DialogTitle className="flex items-center">
							导入策略到策略库（选股）
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-1">
						<span className="text-sm">🛟 支持导入：</span>
						<ul className="space-y-2">
							<li className="list-item">
								<span className="mr-1">✅</span>
								选股策略回测框架𝓟𝓻𝓸（select-stock-pro）
							</li>
							<li className="list-item">
								<span className="mr-1">⚠️</span>
								分享会策略库下载的
								<span className="font-bold text-warning">选股类</span>
								精心随机策略
							</li>
							<li className="list-item">
								<span className="mr-1">🚫</span>
								仓位管理策略回测框架（stock-position-mgmt）
							</li>
							<li className="list-item">
								<span className="mr-1">🚫</span>
								大A实盘选股框架𝓕𝓾𝓼𝓲𝓸𝓷（stock-position-mgmt-fusion）
							</li>
						</ul>
					</div>
					<hr />
					<div className="space-y-1">
						<span className="text-sm">ℹ️ 导入说明：</span>
						<ul className="list-inside space-y-2">
							<li className="flex items-center">
								<BadgePlus size={18} className="mr-2" /> 选中策略会{" "}
								<span className="text-success font-bold">增加</span>
								到当前策略库中
							</li>
							<li className="flex items-center">
								<ShieldCheck size={18} className="mr-2" />
								导入成功后，为了资金安全，新增策略资金占比会
								<span className="text-blue-400">重置为 0</span>
							</li>
							<li className="flex items-center">
								<Scale size={18} className="mr-2" />
								需要在页面上<span className="text-warning-600">重新配置</span>
								回测和实盘资金权重
							</li>
						</ul>
					</div>
					<hr />
					<div className="bg-warning-100 text-warning-600 py-2 px-3 rounded-lg leading-relaxed text-sm">
						<p className="flex items-center gap-2 font-bold">
							<TriangleAlert size={18} /> 导入提示
						</p>
						<div className="text-xs leading-relaxed">
							如果遇到导入失败，很可能你的“策略库”或者“因子库”有只读的.py文件，客户端无法自动写入。可以{" "}
							<span className="font-bold text-warning-700">打开文件夹</span> 后
							，删除 <span className="font-bold text-warning-700">策略库</span>{" "}
							和 <span className="font-bold text-warning-700">因子库</span>{" "}
							文件夹后，然后再导入
						</div>
					</div>
					<DialogFooter className="p-0">
						<Button variant="outline" onClick={() => setImportOpen(false)}>
							取消
						</Button>
						<Button
							disabled={isPending}
							className="min-w-32"
							onClick={async (e) => {
								e.preventDefault()
								e.stopPropagation()
								handleToggleAutoRocket(false, true, true)
								// setStoreValue("auto_real_trading", false) // 关闭自动实盘
								const res = await selectFile({
									filters: [{ name: "python", extensions: ["py"] }],
								})

								res && (await importLibraryDir(res as string))
							}}
						>
							{isPending ? "导入中..." : "选择配置文件"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent className="p-4">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center">
							<OctagonAlert className="mr-2" /> 确认清空策略库吗？
						</AlertDialogTitle>
						<AlertDialogDescription className="py-1 leading-loose">
							<span>※ 清空之后需要从“策略代码”中重新导入，</span>
							<br />
							<span>※ 并且配置资金占比。</span>
							<br />
							<span>※ 同时会自动关闭“自动实盘”的选项。</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>取消</AlertDialogCancel>
						<Button
							variant={"destructive"}
							onClick={async () => {
								resetSelectStgList() // 清空策略库
								handleToggleAutoRocket(false, true, true).then(() => {
									setDeleteOpen(false)
									toast.success("清空成功")
								})
							}}
						>
							<Eraser className="mr-2" /> 清空策略库，继续
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
