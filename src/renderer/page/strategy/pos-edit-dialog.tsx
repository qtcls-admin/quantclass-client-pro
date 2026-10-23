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
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { EditIcon } from "@/renderer/icons/EditIcon"
import {
	PosStrategyForm,
	type PosStrategyFormData,
} from "@/renderer/page/strategy/pos-form"
import type { PosStrategyType } from "@/renderer/types/strategy"
import { useState } from "react"

export default function PosStrategyEditDialog({
	posStrategy,
	fusionIndex,
}: {
	posStrategy: PosStrategyType
	fusionIndex: number
}) {
	const [open, setOpen] = useState(false)
	const [isHovered, setIsHovered] = useState(false)

	const defaultValues: PosStrategyFormData = {
		remark_name: posStrategy.remark_name ?? "",
	}

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="rounded-full size-6"
				onClick={(e) => {
					e.stopPropagation()
					setOpen(true)
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<EditIcon className="w-4 h-4" forceAnimate={isHovered} />
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-4xl p-0 gap-0">
					<DialogHeader className="p-4">
						<DialogTitle className="flex items-center gap-2">
							<EditIcon className="size-7" />
							<span>编辑 {posStrategy.name}（仓位策略）</span>
						</DialogTitle>
					</DialogHeader>
					<div className="border-t">
						<PosStrategyForm
							key={posStrategy.name}
							defaultValues={defaultValues}
							posStrategy={posStrategy}
							fusionIndex={fusionIndex}
							onSuccess={() => setOpen(false)}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
