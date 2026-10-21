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
	ProcessHoverCard,
	ProcessHoverCardContent,
	ProcessHoverCardTrigger,
} from "@/renderer/components/ui/process-monitor-hover-card"
import { cn } from "@/renderer/lib/utils"
import { ProcessCard } from "@/renderer/page/home/ProcessKanban"
import { isAutoRocketAtom, isUpdatingAtom } from "@/renderer/store"
import { useRocketVisible } from "@/renderer/hooks/useRocketVisible"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { useAtom, useAtomValue } from "jotai"

export type KernelKey = "fuel" | "fusion" | "rocket" | "scm"

export type KernelStatusLevel = "ok" | "warn" | "idle"

export interface KernelStatus {
	level: KernelStatusLevel
	label: string
}

export function getKernelStatus(
	kernel: KernelKey,
	processes: { kernel: string }[] | undefined,
	isUpdating: boolean,
	isAutoRocket: boolean,
): KernelStatus {
	if (processes?.some((p) => p.kernel === kernel)) {
		return { level: "ok", label: "运行中" }
	}
	if (isUpdating && kernel === "fuel") {
		return { level: "warn", label: "更新中" }
	}
	if (isAutoRocket && (kernel === "fusion" || kernel === "rocket")) {
		return { level: "warn", label: "启动中" }
	}
	return { level: "idle", label: "未运行" }
}

const LEVEL_STYLES: Record<KernelStatusLevel, { text: string; dot: string }> = {
	ok: {
		text: "text-green-600",
		dot: "bg-green-500 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]",
	},
	warn: {
		text: "text-amber-600",
		dot: "bg-amber-500",
	},
	idle: {
		text: "text-muted-foreground",
		dot: "bg-muted-foreground/40",
	},
}

export function useResearchKernel(): KernelKey {
	return "fusion"
}

export function ModuleKernelBadge({ kernel }: { kernel: KernelKey }) {
	const [{ data }] = useAtom(monitorProcessesQueryAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isAutoRocket = useAtomValue(isAutoRocketAtom)
	const status = getKernelStatus(kernel, data, isUpdating, isAutoRocket)
	const styles = LEVEL_STYLES[status.level]

	return (
		<ProcessHoverCard>
			<ProcessHoverCardTrigger asChild>
				<span
					className={cn(
						"flex items-center gap-1.5 text-[11px] font-mono font-semibold flex-shrink-0 cursor-default",
						styles.text,
					)}
				>
					<i className={cn("w-2 h-2 rounded-full flex-shrink-0", styles.dot)} />
					{status.label}
				</span>
			</ProcessHoverCardTrigger>
			<ProcessHoverCardContent>
				<ProcessCard data={data} kernel={kernel} />
			</ProcessHoverCardContent>
		</ProcessHoverCard>
	)
}

function KernelStatusLine({
	label,
	kernel,
}: {
	label: string
	kernel: KernelKey
}) {
	const [{ data }] = useAtom(monitorProcessesQueryAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isAutoRocket = useAtomValue(isAutoRocketAtom)
	const status = getKernelStatus(kernel, data, isUpdating, isAutoRocket)
	const styles = LEVEL_STYLES[status.level]

	return (
		<ProcessHoverCard>
			<ProcessHoverCardTrigger asChild>
				<span
					className={cn(
						"flex items-center justify-end gap-1.5 text-[11px] font-mono font-semibold leading-none cursor-default",
						styles.text,
					)}
				>
					<span className="text-muted-foreground font-semibold">{label}</span>
					<i className={cn("w-2 h-2 rounded-full flex-shrink-0", styles.dot)} />
					<span className="min-w-[3em] text-right">{status.label}</span>
				</span>
			</ProcessHoverCardTrigger>
			<ProcessHoverCardContent>
				<ProcessCard data={data} kernel={kernel} />
			</ProcessHoverCardContent>
		</ProcessHoverCard>
	)
}

export function TradingModuleStatusStack() {
	const researchKernel = useResearchKernel()
	const rocketVisible = useRocketVisible()

	return (
		<div className="flex flex-col items-end gap-1.5 shrink-0">
			<KernelStatusLine label="选股" kernel={researchKernel} />
			{rocketVisible ? (
				<KernelStatusLine label="下单" kernel="rocket" />
			) : null}
		</div>
	)
}
