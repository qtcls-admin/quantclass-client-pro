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
	getKernelStatus,
	type KernelKey,
	type KernelStatusLevel,
	useResearchKernel,
} from "@/renderer/page/home/kernel-status"
import { isAutoRocketAtom, isUpdatingAtom } from "@/renderer/store"
import { useRocketVisible } from "@/renderer/hooks/useRocketVisible"
import { monitorProcessesQueryAtom } from "@/renderer/store/query"
import { useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"

export interface KernelModuleItem {
	kernel: KernelKey
	shortLabel: string
	status: ReturnType<typeof getKernelStatus>
}

const MODULE_SHORT_LABELS: Record<KernelKey, string> = {
	fuel: "数据",
	fusion: "选股",
	rocket: "下单",
	scm: "配置",
}

function getQueueChipStatus(
	modules: KernelModuleItem[],
): KernelStatusLevel {
	if (modules.some((m) => m.status.level === "ok")) return "ok"
	if (modules.some((m) => m.status.level === "warn")) return "warn"
	return "idle"
}

export function useKernelModulesStatus() {
	const [{ data: processes }] = useAtom(monitorProcessesQueryAtom)
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isAutoRocket = useAtomValue(isAutoRocketAtom)
	const rocketVisible = useRocketVisible()
	const researchKernel = useResearchKernel()

	const modules = useMemo<KernelModuleItem[]>(() => {
		const kernels: KernelKey[] = rocketVisible
			? ["fuel", researchKernel, "rocket"]
			: ["fuel", researchKernel]
		return kernels.map((kernel) => ({
			kernel,
			shortLabel: MODULE_SHORT_LABELS[kernel],
			status: getKernelStatus(kernel, processes, isUpdating, isAutoRocket),
		}))
	}, [
		processes,
		isUpdating,
		isAutoRocket,
		researchKernel,
		rocketVisible,
	])

	const runningCount = modules.filter((m) => m.status.level === "ok").length
	const chipStatus = getQueueChipStatus(modules)

	return {
		modules,
		processes,
		runningCount,
		totalCount: modules.length,
		chipStatus,
	}
}
