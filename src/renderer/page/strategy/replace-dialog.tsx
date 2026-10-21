/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import type {
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import {
	collectFusionRemarkNames,
	collectSelectRemarkNames,
} from "@/renderer/utils/strategy"
import { ArrowLeftRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const { selectFile, importFusion } = window.electronAPI

type StrategyType = "select" | "pos" | "group"

interface StrategyReplaceDialogProps {
	strategy: SelectStgType | PosStrategyType | StgGroupType
	strategyType: StrategyType
	onReplace: (newStrategy: any) => void
	buttonClassName?: string
}

function getStrategyType(strategy: any): StrategyType {
	if (strategy.strategy_pool) return "pos"
	if (strategy.strategy_list) return "group"
	return "select"
}

function collectAllSelectStrategies(strategies: any[]): any[] {
	const result: any[] = []

	for (const s of strategies) {
		if (getStrategyType(s) === "select") {
			result.push(s)
			continue
		}
		if (getStrategyType(s) !== "group" || !Array.isArray(s.strategy_list))
			continue
		for (const child of s.strategy_list) {
			if (getStrategyType(child) === "select") {
				result.push(child)
			}
		}
	}

	return result
}

export default function StrategyReplaceDialog({
	strategy,
	strategyType,
	onReplace,
	buttonClassName = "h-8 w-8",
}: StrategyReplaceDialogProps) {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [candidates, setCandidates] = useState<any[]>([])
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
	const [remarkName, setRemarkName] = useState("")
	const [step, setStep] = useState<"intro" | "selecting" | "confirming">(
		"intro",
	)

	const { selectStgList } = useStrategyManager()
	const { fusion } = useFusionManager()

	const currentRemarkName = (strategy as any).remark_name?.trim() || ""

	const resetState = () => {
		setStep("intro")
		setCandidates([])
		setSelectedIndex(null)
		setRemarkName("")
	}

	const handleOpenIntro = () => {
		resetState()
		setRemarkName(currentRemarkName)
		setOpen(true)
	}

	const handleSelectFile = async () => {
		const filePath = await selectFile({
			filters: [{ name: "python", extensions: ["py"] }],
		})
		if (!filePath) return

		setLoading(true)
		try {
			const result = await importFusion(filePath as string)
			if (!result.success || !result.jsonStr) {
				toast.dismiss()
				if (result.readonlyFiles?.length) {
					const preview = result.readonlyFiles.slice(0, 12).join("\n")
					const suffix =
						result.readonlyFiles.length > 12
							? `\n…等共 ${result.readonlyFiles.length} 个只读文件`
							: ""
					toast.error("导入失败：以下文件为只读", {
						description: preview + suffix,
						duration: 12_000,
					})
				} else {
					toast.error(result.error ?? "解析 config.py 失败")
				}
				return
			}

			const jsonObj = JSON.parse(result.jsonStr)
			let allStrategies: any[] = []

			switch (result.importType) {
				case "fusion":
					allStrategies = jsonObj
					break
				case "pos":
					allStrategies = [jsonObj]
					break
				case "select":
					allStrategies = jsonObj
					break
			}

			const matched =
				strategyType === "select"
					? collectAllSelectStrategies(allStrategies)
					: allStrategies.filter((s) => getStrategyType(s) === strategyType)

			if (matched.length === 0) {
				toast.warning("未找到同类型的策略")
				return
			}

			setCandidates(matched)
			setSelectedIndex(null)
			setRemarkName(currentRemarkName)
			setStep("selecting")
		} catch (err) {
			toast.error("解析失败，请检查 config.py 格式")
		} finally {
			setLoading(false)
		}
	}

	const handleConfirm = () => {
		if (selectedIndex === null) {
			toast.warning("请选择一个策略")
			return
		}

		if (!currentRemarkName) {
			setStep("confirming")
			return
		}

		doReplace(currentRemarkName)
	}

	const handleRemarkConfirm = () => {
		const trimmed = remarkName.trim()
		if (!trimmed) {
			toast.warning("替换前必须设置策略标识")
			return
		}
		doReplace(trimmed)
	}

	const doReplace = (finalRemarkName: string) => {
		const trimmed = finalRemarkName.trim()
		if (trimmed) {
			const isFusion = strategyType === "pos" || strategyType === "group"
			if (isFusion) {
				const existing = collectFusionRemarkNames(fusion)
				if (existing.has(trimmed) && trimmed !== currentRemarkName) {
					toast.error("策略标识已存在，请使用其他标识")
					return
				}
			} else {
				const existing = collectSelectRemarkNames(selectStgList)
				if (existing.has(trimmed) && trimmed !== currentRemarkName) {
					toast.error("策略标识已存在，请使用其他标识")
					return
				}
			}
		}

		const candidate = candidates[selectedIndex!]
		const replaced = {
			...candidate,
			remark_name: finalRemarkName,
			cap_weight: (strategy as any).cap_weight ?? 0,
			isFold: (strategy as any).isFold ?? false,
		}

		if (strategyType === "pos") replaced.type = "pos"
		else if (strategyType === "group") replaced.type = "group"

		onReplace(replaced)
		toast.success(`已替换策略为「${candidate.name}」`)
		setOpen(false)
		resetState()
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className={buttonClassName}
				disabled={loading}
				onClick={(e) => {
					e.stopPropagation()
					handleOpenIntro()
				}}
				title="替换策略"
			>
				{loading ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					<ArrowLeftRight className="w-4 h-4" />
				)}
			</Button>

			<Dialog
				open={open}
				onOpenChange={(value) => {
					setOpen(value)
					if (!value) resetState()
				}}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{step === "intro"
								? `替换策略「${(strategy as any).name}」`
								: step === "selecting"
									? `选择替换「${(strategy as any).name}」的策略`
									: "设置策略标识"}
						</DialogTitle>
					</DialogHeader>

					{step === "intro" && (
						<div className="space-y-4 py-2 text-sm text-muted-foreground">
							<p>
								将使用 config文件 中的
								<strong className="text-foreground">同类型</strong>
								策略替换当前策略，规则如下：
							</p>
							<ul className="list-disc space-y-2 pl-5">
								<li>
									仅展示与被替换策略
									<strong className="text-foreground">相同类型</strong>
									的候选策略供选择
								</li>
								<li>
									替换后保留当前策略的
									<strong className="text-foreground">
										资金占比（cap_weight）
									</strong>
									和
									<strong className="text-foreground">
										策略标识（remark_name）
									</strong>
								</li>
								<li>
									若当前策略尚未设置策略标识，替换前必须手动填写一个
									<strong className="text-foreground">唯一</strong>的
									<strong className="text-foreground">
										策略标识（remark_name）
									</strong>
								</li>
								<li>除上述保留字段外，其余配置将完全替换为新策略的内容</li>
							</ul>
						</div>
					)}

					{step === "selecting" && (
						<div className="space-y-3 py-2">
							<p className="text-sm text-muted-foreground">
								从导入的 config.py 中找到 {candidates.length} 个同类型策略：
							</p>
							<RadioGroup
								value={selectedIndex?.toString()}
								onValueChange={(val) => setSelectedIndex(Number(val))}
								className="space-y-2"
							>
								{candidates.map((c, i) => (
									<div
										key={`${c.name}-${i}`}
										className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
										onClick={() => setSelectedIndex(i)}
									>
										<RadioGroupItem
											value={i.toString()}
											id={`candidate-${i}`}
										/>
										<Label
											htmlFor={`candidate-${i}`}
											className="flex-1 cursor-pointer"
										>
											<div className="font-medium">{c.name}</div>
											{strategyType === "select" && (
												<div className="text-xs text-muted-foreground">
													持仓周期: {c.hold_period ?? "-"} | 选股数量:{" "}
													{c.select_num ?? "-"}
												</div>
											)}
											{strategyType === "group" && (
												<div className="text-xs text-muted-foreground">
													包含 {c.strategy_list?.length ?? 0} 个子策略
												</div>
											)}
											{strategyType === "pos" && (
												<div className="text-xs text-muted-foreground">
													持仓周期: {c.hold_period ?? "-"} | Pool:{" "}
													{c.strategy_pool?.length ?? 0} 个子策略
												</div>
											)}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					)}

					{step === "confirming" && (
						<div className="space-y-4 py-2">
							<p className="text-sm text-muted-foreground">
								替换前需要为当前策略设置一个策略标识（remark_name），作为唯一标识符：
							</p>
							<Input
								placeholder="请输入策略标识"
								value={remarkName}
								onChange={(e) => setRemarkName(e.target.value)}
								autoFocus
							/>
						</div>
					)}

					<DialogFooter>
						{step === "intro" && (
							<>
								<Button variant="outline" onClick={() => setOpen(false)}>
									取消
								</Button>
								<Button disabled={loading} onClick={handleSelectFile}>
									{loading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											解析中…
										</>
									) : (
										"选择策略文件"
									)}
								</Button>
							</>
						)}
						{step === "confirming" && (
							<Button variant="outline" onClick={() => setStep("selecting")}>
								返回
							</Button>
						)}
						{step !== "intro" && (
							<Button
								onClick={
									step === "selecting" ? handleConfirm : handleRemarkConfirm
								}
								disabled={step === "selecting" && selectedIndex === null}
							>
								{step === "selecting" ? "确认替换" : "确认"}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
