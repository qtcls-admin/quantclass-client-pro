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
import { EditIcon } from "@/renderer/icons/EditIcon"
import { SelectStgForm } from "@/renderer/page/strategy/form"
import type { BasicStgType, SelectStgType } from "@/renderer/types/strategy"

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { useStrategyManager } from "@/renderer/hooks/useStrategyManager"
import {
	collectFusionRemarkNames,
	collectSelectRemarkNames,
} from "@/renderer/utils/strategy"
import { useState } from "react"
import { toast } from "sonner"

export default function StrategyEditDialog({
	strategy,
	rowIndex,
	fusionIndex = -1, //如果是分享会的话，会使用不同的更新逻辑
}: {
	strategy: SelectStgType
	rowIndex: number
	fusionIndex?: number
}) {
	const [open, setOpen] = useState(false)
	const [isHovered, setIsHovered] = useState(false)

	const { selectStgList, updateSelectStg } = useStrategyManager()

	const { fusion, updateFusionStgInRow } = useFusionManager()

	const checkRemarkNameUnique = (remarkName: string): boolean => {
		const trimmed = remarkName?.trim()
		if (!trimmed) return true

		if (fusionIndex < 0) {
			const existing = collectSelectRemarkNames(selectStgList, rowIndex)
			if (existing.has(trimmed)) {
				toast.error("策略标识已存在，请使用其他标识")
				return false
			}
		} else {
			const existing = collectFusionRemarkNames(fusion, {
				fusionIndex,
				rowIndex,
			})
			if (existing.has(trimmed)) {
				toast.error("策略标识已存在，请使用其他标识")
				return false
			}
		}
		return true
	}

	const handleSave = async (values: any) => {
		if (!checkRemarkNameUnique(values.remark_name)) return

		const updatedStg = {
			...strategy,
			...values,
			offset_list: values.offset_list.split(",").map(Number),
			rebalance_time: values.rebalance_time,
		} as SelectStgType

		try {
			await updateSelectStg(rowIndex, updatedStg as BasicStgType)
			console.log("library-row-save", updatedStg)
			toast.success(`🔥 ${strategy.name} 配置成功`)
		} catch {
			toast.error("保存策略失败")
		}
	}

	/**
	 * 保存Fusion模式下的策略
	 * @param values
	 */
	const handleSavePos = async (values: any) => {
		if (!checkRemarkNameUnique(values.remark_name)) return

		try {
			const newStg = await updateFusionStgInRow(
				fusionIndex,
				values,
				strategy,
				rowIndex,
			)
			console.log("fusion-row-save", newStg)
		} catch {
			toast.error("保存策略失败")
		}
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8"
				onClick={(e) => {
					e.stopPropagation()
					setOpen(true)
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<EditIcon className="w-4 h-4" forceAnimate={isHovered} />
			</Button>

			<Dialog
				open={open}
				onOpenChange={(value) => {
					setOpen(value)
				}}
			>
				<DialogContent className="max-w-4xl p-0 gap-0">
					<DialogHeader className="p-4">
						<DialogTitle className="flex items-center gap-2">
							<EditIcon className="size-7" />
							<span>编辑{strategy.name}</span>
						</DialogTitle>
					</DialogHeader>
					<div className="border-t">
						<SelectStgForm
							key={strategy.name}
							name={strategy.name}
							submitText="保存设置"
							defaultValues={{
								remark_name: strategy.remark_name ?? "",
								hold_period: strategy.hold_period,
								offset_list: (strategy.offset_list ?? ["0"]).join(","),
								filter_list: strategy.filter_list || [],
								filter_list_post: strategy.filter_list_post || [],
								factor_list: strategy.factor_list,
								select_num: strategy.select_num,
								select_inclusive: strategy.select_inclusive ?? "both",
								rebalance_time: strategy.rebalance_time ?? "close-open",
								timing: strategy.timing,
								override: strategy.override,
								scalein_targets: strategy.scalein_targets,
								cross_sections: strategy.cross_sections || [],
								stock_timing_list: strategy.stock_timing_list || [],
								stock_timing: strategy.stock_timing || {},
							}}
							onSave={async (values) => {
								if (fusionIndex < 0) {
									await handleSave(values)
								} else {
									await handleSavePos(values)
								}
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
