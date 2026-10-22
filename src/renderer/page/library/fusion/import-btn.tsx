/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useBacktestDialog } from "@/renderer/components/backtest-dialog"
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { TRADING_SECTION_ROUTE } from "@/renderer/constant"
import { useToggleAutoRealTrading } from "@/renderer/hooks"
import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { openRealTradingFolder } from "@/renderer/utils"
import { useMutation } from "@tanstack/react-query"
// import { isArray } from "lodash-es"
import {
	AlignVerticalSpaceAround,
	BadgePlus,
	Clock,
	Command,
	Eraser,
	FolderDown,
	FolderOpen,
	Loader2,
	OctagonAlert,
	PencilRuler,
	// Scale,
	ShieldCheck,
	TriangleAlert,
	TvMinimalPlay,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import RebTimeConfigModal from "../../../components/RebTimeConfigModal"
import TradeCtrlBtn from "../../../components/trade-ctrl-btn"

const { selectFile, setStoreValue, importFusion } = window.electronAPI

export default function ImportStrategyButton() {
	const [pending, setPending] = useState(false)
	const [isImporting, setIsImporting] = useState(false)
	const [importOpen, setImportOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [rebTimeConfigOpen, setRebTimeConfigOpen] = useState(false)
	const navigate = useNavigate()
	const { openBacktest } = useBacktestDialog()
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { fusion, addFusionStrategies, updateFusion, resetFusion } =
		useFusionManager()

	/**
	 * 处理策略
	 * @param strategy 策略
	 * @param synConfig 同步配置
	 * @returns 处理后的策略
	 */
	const processStrategy = (
		strategy: any,
		synConfig: {
			hold_period?: string
			offset_list?: number[]
			rebalance_time?: string
		} = {},
	) => {
		const strategyCopy = { ...strategy }
		if (strategyCopy.strategy_pool) {
			// ** 仓位管理策略 **
			// 递归处理 strategy_pool 中的每个子策略
			strategyCopy.strategy_pool = strategyCopy.strategy_pool.map(
				(stg_or_grp: SelectStgType | StgGroupType) =>
					// 仓位管理策略，将策略周期属性传递给 processStrategy
					processStrategy(stg_or_grp, {
						hold_period: strategyCopy.hold_period,
						offset_list: strategyCopy.offset_list,
						rebalance_time: strategyCopy.rebalance_time,
					}),
			)
			strategyCopy.type = "pos"
			return strategyCopy as PosStrategyType
		} else if (strategyCopy.strategy_list) {
			// ** 策略组 **
			// 处理嵌套的 strategy_list
			const allCapWeight = strategyCopy.strategy_list.reduce(
				(sum: number, selectStg: SelectStgType) => {
					selectStg.cap_weight = selectStg.cap_weight ?? 1
					return sum + selectStg.cap_weight
				},
				0,
			)
			const all_cap_weight = Math.max(allCapWeight, 1)
			strategyCopy.strategy_list = strategyCopy.strategy_list.map(
				(selectStg: SelectStgType) => {
					return {
						...selectStg,
						...synConfig,
						cap_weight: selectStg.cap_weight / all_cap_weight,
						remark_name: selectStg.remark_name ?? "",
					}
				},
			)
			strategyCopy.remark_name = strategyCopy.remark_name ?? ""
			strategyCopy.type = "group"
			return strategyCopy as StgGroupType
		} else {
			// ** 单个策略 **
			// 如果没有 strategy_list 且没有 strategy_pool，不处理
			return {
				...strategyCopy,
				...synConfig,
				remark_name: strategyCopy.remark_name ?? "",
			} as SelectStgType
		}
	}
	const processStrategies = (
		strategies: (SelectStgType | StgGroupType | PosStrategyType)[],
	) => {
		const initialReset = strategies.map((item) => ({
			...item,
			cap_weight: 0,
			isFold: false,
			remark_name: item.remark_name ?? "",
		}))
		return initialReset.map((item) => processStrategy(item, {}))
	}
	const { mutateAsync: importPositionLibraryDir } = useMutation({
		mutationKey: ["import-fusion"],
		mutationFn: async (configFilePath: string) =>
			await importFusion(configFilePath),
		onSuccess: async (data) => {
			if (!data.success || !data.jsonStr) {
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
					toast.error(data.error ?? "导入失败，请检查配置文件")
				}
				console.log("导入失败", data)
				return
			}
			const {
				jsonStr,
				backtestName,
				importType, // 默认是fusion，兼容select和pos
			} = data

			console.log("导入的策略", importType, jsonStr)
			const jsonObj = await JSON.parse(jsonStr)
			let strategies: any[] = []

			switch (importType) {
				case "fusion":
					strategies = jsonObj
					break
				case "pos":
					strategies = [jsonObj]
					break
				case "select":
					strategies = [
						{
							name: backtestName,
							strategy_list: jsonObj,
							cap_weight: 0,
						},
					]
					break
			}

			const processedStrategies = processStrategies(strategies)

			try {
				await addFusionStrategies(processedStrategies)
			} catch {
				toast.error("导入失败")
				return
			}

			setStoreValue("pos_mgmt.backtest_name", backtestName)
			setImportOpen(false)
			toast.success("导入成功")
		},
		onError: () => {
			toast.dismiss()
			toast.error("导入失败")
		},
	})
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center space-x-2">
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
						清空所有策略
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
					className="h-8 gap-1 lg:flex"
					onClick={() => setRebTimeConfigOpen(true)}
				>
					<Clock size={16} className="mr-2" />
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
								添加策略到策略库
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-1">
							<span className="text-sm">🛟 支持导入：</span>
							<ul className="space-y-2">
								<li className="list-item">
									<span className="mr-1 text-success">✅</span>
									分享会策略库下载的<span className="font-bold">所有</span>
									精心随机策略
								</li>
								<li className="list-item">
									<span className="mr-1 text-success">✅</span>
									选股策略回测框架𝓟𝓻𝓸（select-stock-pro）
								</li>
								<li className="list-item">
									<span className="mr-1 text-success">✅</span>
									仓位管理策略回测框架（stock-position-mgmt）
								</li>
								<li className="list-item">
									<span className="mr-1 text-success">✅</span>
									大A实盘选股框架𝓕𝓾𝓼𝓲𝓸𝓷（stock-position-mgmt-fusion）
								</li>
							</ul>
						</div>
						<hr />
						<div className="space-y-1">
							<span className="text-sm">ℹ️ 导入说明：</span>
							<ul className="list-inside space-y-2">
								<li className="flex items-start">
									<Command size={18} className="mr-2 min-w-5 mt-1" />
									解压缩后，选择 config.py
									文件即可。客户端会导入策略配置并自动拷贝需要的文件夹
								</li>
								<li className="flex items-center">
									<BadgePlus size={18} className="mr-2 min-w-5" />
									选中策略或者组合会{" "}
									<span className="text-success font-bold">增加</span>
									到当前策略混合中
								</li>
								<li className="flex items-center">
									<ShieldCheck size={18} className="mr-2 min-w-5" />
									导入成功后为了资金安全，新增策略资金占比会
									<span className="text-warning font-bold">重置为 0</span>
								</li>
							</ul>
						</div>
						<hr />
						<div className="bg-warning-100 text-warning-600 py-2 px-3 rounded-lg leading-relaxed text-sm">
							<p className="flex items-center gap-2 font-bold">
								<TriangleAlert size={18} /> 导入提示
							</p>
							<div className="text-xs leading-relaxed">
								如果遇到导入失败，很可能你导入的信息中有只读的.py文件，客户端无法自动写入。可以{" "}
								<span className="font-bold text-warning-700">打开文件夹</span>{" "}
								后 ，删除{" "}
								<span className="font-bold text-warning-700">策略库</span>
								{"、"}
								<span className="font-bold text-warning-700">因子库</span>
								{"、"}
								<span className="font-bold text-warning-700">信号库</span>
								{"、"}
								<span className="font-bold text-warning-700">仓位管理</span>
								{"、"}
								<span className="font-bold text-warning-700">
									截面因子库（如有）
								</span>
								{"、"}
								<span className="font-bold text-warning-700">
									外部数据（如有）
								</span>
								文件夹后，然后再导入
							</div>
						</div>
						<DialogFooter className="p-0">
							<Button variant="outline" onClick={() => setImportOpen(false)}>
								取消
							</Button>
							<Button
								disabled={isImporting}
								className="min-w-32"
								onClick={async (e) => {
									e.preventDefault()
									e.stopPropagation()
									setIsImporting(true)
									handleToggleAutoRocket(false, true, true)
									const res = await selectFile({
										filters: [{ name: "python", extensions: ["py"] }],
									})
									res && (await importPositionLibraryDir(res as string))
									setIsImporting(false)
								}}
							>
								{isImporting ? "导入中..." : "选择配置文件"}
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
								<span>※ 清空之后需要从"策略代码"中重新导入，</span>
								<br />
								<span>※ 并且配置资金占比。</span>
								<br />
								<span>※ 同时会自动关闭"自动实盘"的选项。</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>取消</AlertDialogCancel>
							<Button
								variant={"destructive"}
								onClick={async () => {
									try {
										await resetFusion()
										await handleToggleAutoRocket(false, true, true)
										setDeleteOpen(false)
										toast.success("清空成功")
									} catch {
										toast.error("清空失败")
									}
								}}
							>
								<Eraser className="mr-2" /> 清空策略库，继续
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			<div className="flex items-center space-x-2">
				<Button
					size="sm"
					className="h-8 lg:flex"
					disabled={isAutoRocket || fusion.length === 0}
					onClick={async () => {
						if (fusion.length === 0) {
							toast.warning("请先导入策略")
							return
						}
						const avgCapWeight = Number.parseFloat(
							(1 / fusion.length).toFixed(7),
						)
						const _fusion = fusion.map((s) => ({
							...s,
							cap_weight: avgCapWeight,
						}))
						try {
							await updateFusion(_fusion)
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
		</div>
	)
}
