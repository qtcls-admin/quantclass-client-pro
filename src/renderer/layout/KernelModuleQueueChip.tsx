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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { useKernelModulesStatus } from "@/renderer/hooks/useKernelModulesStatus"
import { cn } from "@/renderer/lib/utils"
import { ProcessCard } from "@/renderer/page/home/ProcessKanban"
import type { KernelStatusLevel } from "@/renderer/page/home/kernel-status"

const CHIP_DOT: Record<KernelStatusLevel, string> = {
	ok: "bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]",
	warn: "bg-amber-500",
	idle: "bg-muted-foreground/40",
}

const CHIP_TEXT: Record<KernelStatusLevel, string> = {
	ok: "text-green-600",
	warn: "text-amber-600",
	idle: "text-muted-foreground",
}

export function KernelModuleQueueChip() {
	const { modules, processes, chipStatus, runningCount, totalCount } =
		useKernelModulesStatus()
	const chipValue = `${runningCount}/${totalCount} 运行中`

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] cursor-pointer transition-colors hover:border-foreground/35 hover:text-foreground",
						CHIP_TEXT[chipStatus],
					)}
				>
					<i
						className={cn(
							"w-2 h-2 rounded-full flex-shrink-0",
							CHIP_DOT[chipStatus],
						)}
					/>
					<span>内核</span>
					<span className="font-mono text-[10px] text-muted-foreground">
						{chipValue}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[320px] p-3"
				side="bottom"
				align="start"
				sideOffset={8}
			>
				<p className="text-xs font-semibold text-muted-foreground mb-2.5">
					监控内核运行状态
				</p>
				<div className="flex flex-col gap-2">
					{modules.map((module) => (
						<ProcessCard
							key={module.kernel}
							data={processes}
							kernel={module.kernel}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
