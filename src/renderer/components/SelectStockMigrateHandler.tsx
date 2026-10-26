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
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Label } from "@/renderer/components/ui/label"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import { settingsAtom } from "@/renderer/store/electron"
import {
	backtestConfigAtom,
	fusionAtom,
	reTimingAtom,
	rebTimeConfigAtom,
	strategyRuntimeConfigAtom,
} from "@/renderer/store/storage"
import {
	type SelectStockMigrationDecision,
	type StrategyPreviewItem,
	applySelectStockMigration,
} from "@/renderer/utils/migrate-select-stock-to-pos-mgmt"
import {
	getPendingSelectStockMigration,
	settleSelectStockMigration,
	subscribeSelectStockMigration,
} from "@/renderer/utils/select-stock-migration-gate"
import { useAtomValue, useSetAtom } from "jotai"
import { TriangleAlert } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

function StrategyPreviewList({
	items,
	emptyText,
}: {
	items: StrategyPreviewItem[]
	emptyText: string
}) {
	if (items.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyText}</p>
	}

	return (
		<ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
			{items.map((item, index) => (
				<li key={`${item.title}-${index}`} className="truncate">
					<span>{item.title}</span>
					{item.detail ? (
						<span className="ml-2 text-xs text-muted-foreground">
							{item.detail}
						</span>
					) : null}
				</li>
			))}
		</ul>
	)
}

export function SelectStockMigrateHandler() {
	const pending = useSyncExternalStore(
		subscribeSelectStockMigration,
		getPendingSelectStockMigration,
		() => null,
	)
	const [choice, setChoice] = useState<SelectStockMigrationDecision | "">("")
	const [isApplying, setIsApplying] = useState(false)
	const rebTimeConfig = useAtomValue(rebTimeConfigAtom)
	const runtimeConfig = useAtomValue(strategyRuntimeConfigAtom)
	const setFusion = useSetAtom(fusionAtom)
	const setRebTimeConfig = useSetAtom(rebTimeConfigAtom)
	const setRuntimeConfig = useSetAtom(strategyRuntimeConfigAtom)
	const setBacktestConfig = useSetAtom(backtestConfigAtom)
	const setReTiming = useSetAtom(reTimingAtom)
	const setSettings = useSetAtom(settingsAtom)

	useEffect(() => {
		if (!pending) return
		setChoice("")
		setIsApplying(false)
	}, [pending])

	if (!pending) return null

	const { snapshot } = pending
	const mustChoose = snapshot.needsChoice
	const canConfirm = !isApplying && (!mustChoose || choice !== "")

	const handleConfirm = async () => {
		const decision: SelectStockMigrationDecision = mustChoose
			? (choice as SelectStockMigrationDecision)
			: "select"
		if (mustChoose && !choice) {
			toast.warning("请选择要保留的策略库")
			return
		}

		setIsApplying(true)
		try {
			await applySelectStockMigration({
				decision,
				snapshot,
				rebTimeConfig,
				runtimeConfig,
				setFusion,
				setRebTimeConfig,
				setRuntimeConfig,
				setBacktestConfig,
				setReTiming,
				setSettings,
			})
			settleSelectStockMigration(decision)
			toast.success(
				decision === "select"
					? "已将选股策略迁移到仓管策略库"
					: "已保留仓管策略库",
			)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			window.electronAPI.rendererLog(
				"error",
				`[select-stock-migration] 迁移失败：${message}`,
			)
			toast.error("迁移失败，请重试")
			setIsApplying(false)
		}
	}

	return (
		<Dialog open onOpenChange={() => {}}>
			<DialogContent
				disableClose
				className="max-w-xl max-h-[85vh] overflow-y-auto"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TriangleAlert className="h-5 w-5 text-warning" />
						需要完成策略库迁移
					</DialogTitle>
					<DialogDescription className="pt-2 text-left">
						新版本已取消选股模式，分享会策略统一使用仓管策略库。检测到你上次使用的是选股模式，需要完成迁移后才能继续使用。
					</DialogDescription>
				</DialogHeader>

				{mustChoose ? (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							仓管策略库里还有以前切换模式时留下的策略。请选择继续使用哪一套。选择选股模式会覆盖已有仓管策略；选择仓管模式则不再使用选股模式里的策略。
						</p>
						<RadioGroup
							value={choice}
							onValueChange={(value) =>
								setChoice(value as SelectStockMigrationDecision)
							}
							className="space-y-2"
						>
							<div
								className="space-y-2 rounded-md border p-3"
								onClick={() => setChoice("select")}
							>
								<div className="flex items-center gap-3">
									<RadioGroupItem value="select" id="migrate-select" />
									<Label htmlFor="migrate-select" className="cursor-pointer">
										选股模式（当前正在使用，{snapshot.selectList.length} 条）
									</Label>
								</div>
								<div className="pl-7">
									<p className="mb-1 text-xs text-muted-foreground">
										策略组名称：{snapshot.backtestName}
										。未填写策略标识的会自动生成带 # 的名字。
									</p>
									<StrategyPreviewList
										items={snapshot.selectPreview}
										emptyText="当前选股策略库是空的"
									/>
								</div>
							</div>
							<div
								className="space-y-2 rounded-md border p-3"
								onClick={() => setChoice("pos")}
							>
								<div className="flex items-center gap-3">
									<RadioGroupItem value="pos" id="migrate-pos" />
									<Label htmlFor="migrate-pos" className="cursor-pointer">
										仓管模式（历史保留，{snapshot.posList.length} 条）
									</Label>
								</div>
								<div className="pl-7">
									<StrategyPreviewList
										items={snapshot.posPreview}
										emptyText="仓管策略库是空的"
									/>
								</div>
							</div>
						</RadioGroup>
					</div>
				) : (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">
							将把当前选股策略迁移为一条仓管策略组「{snapshot.backtestName}
							」，资金占比为 100%。未填写策略标识的策略会自动生成带 # 的名字。
						</p>
						<StrategyPreviewList
							items={snapshot.selectPreview}
							emptyText="当前选股策略库是空的，确认后仍会切到仓管策略库。"
						/>
					</div>
				)}

				<DialogFooter>
					<Button disabled={!canConfirm} onClick={() => void handleConfirm()}>
						{isApplying ? "正在迁移…" : "确认迁移"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
