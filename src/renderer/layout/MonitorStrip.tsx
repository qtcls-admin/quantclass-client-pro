/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// import {
// 	DATA_SECTION_ROUTE,
// 	DATA_TAB_NAME,
// 	REAL_TRADING_TAB_NAME,
// 	TRADING_SECTION_ROUTE,
// } from "@/renderer/constant"
import { useAppVersions } from "@/renderer/hooks/useAppVersion"
import { useRocketVisible } from "@/renderer/hooks/useRocketVisible"
// import { useProductList } from "@/renderer/hooks/useProductList"
import { useTradingSession } from "@/renderer/hooks/useTradingSession"
import { useVersionCheck } from "@/renderer/hooks/useVersionCheck"
import { KernelModuleQueueChip } from "@/renderer/layout/KernelModuleQueueChip"
import { LogMenuButton } from "@/renderer/layout/LogMenuButton"
import { NotificationsPopover } from "@/renderer/layout/NotificationsPopover"
import { StartupCheckChip } from "@/renderer/layout/StartupCheckChip"
import { SystemVersionChip } from "@/renderer/layout/SystemVersionChip"
import { cn } from "@/renderer/lib/utils"
// import { activeTabAtom } from "@/renderer/store"
import { userAtom } from "@/renderer/store/user"
import { versionsAtom } from "@/renderer/store/versions"
import {
	type KernelVersionUpdateLevel,
	getKernelVersionUpdateLevel,
} from "@/renderer/utils/kernel-version-status"
import { getSelectKernal } from "@/shared/lib/permission"
import type { AppVersions } from "@/shared/types"
import dayjs from "dayjs"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
// import { useNavigate } from "react-router"

// type ChipStatus = "ok" | "info" | "warn" | "err" | "idle"
//
// interface MonitorChip {
// 	label: string
// 	value: string
// 	status: ChipStatus
// 	to: string
// 	navTab: string
// }
//
// const ACCOUNT_MONITOR_CHIP: MonitorChip = {
// 	label: "账户",
// 	value: "1/3 在线",
// 	status: "ok",
// 	to: `${TRADING_SECTION_ROUTE}?tab=real_trading`,
// 	navTab: REAL_TRADING_TAB_NAME,
// }

function mergeKernelVersionUpdateLevels(
	levels: KernelVersionUpdateLevel[],
): KernelVersionUpdateLevel {
	if (levels.some((level) => level === "required")) return "required"
	if (levels.some((level) => level === "optional")) return "optional"
	return "ok"
}

function getSystemKernelVersionUpdateLevel(
	appVersions: AppVersions | undefined,
	localVersions:
		| {
				fuelVersion?: string
				fusionVersion?: string
				aquaVersion?: string
				rocketVersion?: string
		  }
		| undefined,
	selectKernal: "fusion" | "aqua",
	rocketVisible: boolean,
): KernelVersionUpdateLevel {
	const selectVersionKey =
		selectKernal === "fusion" ? "fusionVersion" : "aquaVersion"
	const levels: KernelVersionUpdateLevel[] = [
		getKernelVersionUpdateLevel(
			localVersions?.fuelVersion,
			appVersions?.latest?.fuel,
			appVersions?.fuel ?? [],
		),
		getKernelVersionUpdateLevel(
			localVersions?.[selectVersionKey],
			appVersions?.latest?.[selectKernal],
			appVersions?.[selectKernal] ?? [],
		),
	]

	if (rocketVisible) {
		levels.push(
			getKernelVersionUpdateLevel(
				localVersions?.rocketVersion,
				appVersions?.latest?.rocket,
				appVersions?.rocket ?? [],
			),
		)
	}

	return mergeKernelVersionUpdateLevels(levels)
}

// const CHIP_DOT: Record<ChipStatus, string> = {
// 	ok: "bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]",
// 	info: "bg-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.18)]",
// 	warn: "bg-amber-500",
// 	err: "bg-red-600",
// 	idle: "bg-muted-foreground/40",
// }
//
// const CHIP_TEXT: Record<ChipStatus, string> = {
// 	ok: "text-green-600",
// 	info: "text-blue-600",
// 	warn: "text-amber-600",
// 	err: "text-red-600",
// 	idle: "text-muted-foreground",
// }
//
// function MonitorChipButton({
// 	chip,
// 	onClick,
// }: {
// 	chip: MonitorChip
// 	onClick: () => void
// }) {
// 	return (
// 		<button
// 			type="button"
// 			onClick={onClick}
// 			className={cn(
// 				"inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] cursor-pointer transition-colors hover:border-foreground/35 hover:text-foreground",
// 				CHIP_TEXT[chip.status],
// 			)}
// 		>
// 			<i
// 				className={cn(
// 					"w-2 h-2 rounded-full flex-shrink-0",
// 					CHIP_DOT[chip.status],
// 				)}
// 			/>
// 			<span>{chip.label}</span>
// 			<span className="font-mono text-[10px] text-muted-foreground">
// 				{chip.value}
// 			</span>
// 		</button>
// 	)
// }

export function MonitorStrip() {
	// const navigate = useNavigate()
	// const setActiveTab = useSetAtom(activeTabAtom)
	const { appVersions } = useAppVersions()
	const { hasClientUpdate } = useVersionCheck()
	const rocketVisible = useRocketVisible()
	const localVersions = useAtomValue(versionsAtom)
	const { permissions } = useAtomValue(userAtom)
	const selectKernal = getSelectKernal(permissions)
	const [clock, setClock] = useState(() => dayjs().format("HH:mm:ss"))
	// const { productList } = useProductList()
	const tradingSession = useTradingSession()

	const systemKernelLevel = useMemo(
		() =>
			getSystemKernelVersionUpdateLevel(
				appVersions,
				localVersions,
				selectKernal,
				rocketVisible,
			),
		[appVersions, localVersions, selectKernal, rocketVisible],
	)

	const systemLevel = useMemo(() => {
		if (systemKernelLevel === "required") return "required"
		if (systemKernelLevel === "optional" || hasClientUpdate) return "optional"
		return "ok"
	}, [systemKernelLevel, hasClientUpdate])

	// const monitorChips = useMemo(() => {
	// 	const laggingCount = productList.filter(canIncrementalUpdate).length
	//
	// 	let dataValue: string
	// 	let dataStatus: ChipStatus
	//
	// 	if (productList.length === 0) {
	// 		dataValue = "暂无订阅"
	// 		dataStatus = "idle"
	// 	} else if (laggingCount > 0) {
	// 		dataValue = `${laggingCount} 项滞后`
	// 		dataStatus = "warn"
	// 	} else {
	// 		dataValue = "全部就绪"
	// 		dataStatus = "ok"
	// 	}
	//
	// 	return [
	// 		{
	// 			label: "数据",
	// 			value: dataValue,
	// 			status: dataStatus,
	// 			to: `${DATA_SECTION_ROUTE}?tab=history`,
	// 			navTab: DATA_TAB_NAME,
	// 		},
	// 		ACCOUNT_MONITOR_CHIP,
	// 	]
	// }, [productList])

	useEffect(() => {
		const id = setInterval(() => setClock(dayjs().format("HH:mm:ss")), 1000)
		return () => clearInterval(id)
	}, [])

	return (
		<div
			className="window-control-region flex items-center gap-2 shrink-0"
			aria-label="Global monitoring"
		>
			<span
				className={cn(
					"inline-flex items-center gap-1.5 text-xs font-semibold",
					tradingSession.monitorStripTextClassName,
				)}
			>
				<i
					className={cn(
						"w-1.5 h-1.5 rounded-full",
						tradingSession.monitorStripDotClassName,
					)}
				/>
				{tradingSession.monitorStripText}
			</span>

			<div className="flex items-center gap-2 ml-2">
				<SystemVersionChip level={systemLevel} />
				<KernelModuleQueueChip />
				<StartupCheckChip />

				{/* {monitorChips.map((chip) => (
					<MonitorChipButton
						key={chip.label}
						chip={chip}
						onClick={() => {
							setActiveTab(chip.navTab)
							navigate(chip.to)
						}}
					/>
				))} */}
			</div>

			<span className="font-mono text-xs text-muted-foreground ml-2 tabular-nums">
				{clock}
			</span>

			<span className="w-px h-4 bg-border mx-1 shrink-0" />
			<NotificationsPopover />
			<LogMenuButton />
		</div>
	)
}
