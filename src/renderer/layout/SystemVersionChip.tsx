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
	DialogTrigger,
} from "@/renderer/components/ui/dialog"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { Progress } from "@/renderer/components/ui/progress"
import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import { SETTINGS_PAGE, isWindows } from "@/renderer/constant"
import { UpdateStatus } from "@/renderer/context/update-context"
import { useAppUpdate } from "@/renderer/hooks/useAppUpdate"
import { useVersionCheck } from "@/renderer/hooks/useVersionCheck"
import { cn } from "@/renderer/lib/utils"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import type { KernelVersionUpdateLevel } from "@/renderer/utils/kernel-version-status"
import { formatBytes } from "@/renderer/utils/formatBytes"
import { useAtomValue } from "jotai"
import { CircleArrowUp } from "lucide-react"
import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import { useNavigate } from "react-router"

type ChipStatus = "ok" | "info" | "err"

const KERNEL_LEVEL_CHIP_STATUS: Record<KernelVersionUpdateLevel, ChipStatus> = {
	ok: "ok",
	optional: "info",
	required: "err",
}

const SYSTEM_KERNEL_LEVEL_LABEL: Record<KernelVersionUpdateLevel, string> = {
	ok: "就绪",
	optional: "有更新",
	required: "需更新",
}

const CHIP_DOT: Record<ChipStatus, string> = {
	ok: "bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]",
	info: "bg-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.18)]",
	err: "bg-red-600",
}

const CHIP_TEXT: Record<ChipStatus, string> = {
	ok: "text-green-600",
	info: "text-blue-600",
	err: "text-red-600",
}

const CHIP_TITLE_WIDTH_CLASS = "inline-block w-[1.5rem]"
const CHIP_STATUS_WIDTH_CLASS = "inline-block w-[2.25rem] font-mono text-[10px]"

interface SystemVersionChipProps {
	level: KernelVersionUpdateLevel
}

export function SystemVersionChip({ level }: SystemVersionChipProps) {
	const { status, progress, updateInfo, confirmCallback } = useAppUpdate()
	const { hasAnyUpdate, getUpdateMessage } = useVersionCheck()
	const navigate = useNavigate()
	const [showVersionUpdate, setShowVersionUpdate] = useState(false)
	const [showQmtMode, setShowQmtMode] = useState(false)
	const qmtMode = useAtomValue(realMarketConfigSchemaAtom).qmt_mode ?? "qmt"

	useEffect(() => {
		const timer = setInterval(() => {
			setShowQmtMode((prev) => !prev)
		}, 2000)
		return () => clearInterval(timer)
	}, [])

	const isDownloading = isWindows && status === UpdateStatus.Downloading
	const isConfirmReady = isWindows && status === UpdateStatus.Confirm
	const chipStatus = showQmtMode ? "ok" : KERNEL_LEVEL_CHIP_STATUS[level]
	const isRequiredUpdate = !showQmtMode && level === "required"
	const qmtModeLabel = qmtMode === "qmt" ? "正常" : "特邀"

	return (
		<div className="relative">
			{isDownloading && (
				<div className="absolute bottom-full left-0 mb-1.5 w-[140px] rounded-lg border border-border bg-background px-2 py-1.5 shadow-sm">
					<p className="text-[9px] text-muted-foreground leading-tight mb-1 truncate">
						下载中 {formatBytes(progress?.bytesPerSecond ?? 0)}/s
					</p>
					<Progress value={progress?.percent ?? 0} className="h-1" />
				</div>
			)}

			{isConfirmReady && (
				<div className="absolute top-full left-0 mt-2 z-[100] w-[220px] rounded-lg border border-border bg-background p-3 shadow-lg shadow-black/5">
					<p className="text-xs font-medium mb-2">
						{updateInfo?.version} 已下载
					</p>
					<Dialog>
						<DialogTrigger asChild>
							<Button size="sm" className="w-full h-7 text-xs">
								查看更新内容
							</Button>
						</DialogTrigger>
						<DialogContent className="w-[485px]">
							<DialogHeader>
								<DialogTitle>{updateInfo?.version}-更新日志</DialogTitle>
							</DialogHeader>
							<ScrollArea className="h-[250px] border border-muted-foreground rounded-lg p-2.5">
								<Markdown>{updateInfo?.releaseNotes as string}</Markdown>
							</ScrollArea>
							<DialogFooter>
								<Button onClick={() => confirmCallback(true)}>
									立即应用新版本
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			)}

			<Popover open={showVersionUpdate} onOpenChange={setShowVersionUpdate}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] cursor-pointer transition-colors hover:border-foreground/35 hover:text-foreground shrink-0",
							CHIP_TEXT[chipStatus],
							showQmtMode && "border-green-500/40",
							isRequiredUpdate && "border-red-500/40",
						)}
						onClick={() => {
							setShowVersionUpdate(false)
							navigate(SETTINGS_PAGE)
						}}
						onMouseEnter={() => setShowVersionUpdate(hasAnyUpdate)}
						onMouseLeave={() => setShowVersionUpdate(false)}
						aria-label={
							showQmtMode
								? `QMT ${qmtModeLabel}`
								: `系统 ${SYSTEM_KERNEL_LEVEL_LABEL[level]}`
						}
					>
						<i
							className={cn(
								"w-2 h-2 rounded-full flex-shrink-0",
								CHIP_DOT[chipStatus],
								isRequiredUpdate &&
									"motion-safe:animate-pulse shadow-[0_0_0_3px_rgba(220,38,38,0.45)]",
							)}
						/>
						<span
							className={cn(
								CHIP_TITLE_WIDTH_CLASS,
								isRequiredUpdate && "motion-safe:animate-pulse",
							)}
						>
							{showQmtMode ? "QMT" : "系统"}
						</span>
						<span
							className={cn(
								CHIP_STATUS_WIDTH_CLASS,
								showQmtMode ? "text-green-600" : "text-muted-foreground",
							)}
						>
							{showQmtMode ? qmtModeLabel : SYSTEM_KERNEL_LEVEL_LABEL[level]}
						</span>
					</button>
				</PopoverTrigger>
				{hasAnyUpdate && (
					<PopoverContent className="w-80 p-3" side="bottom" sideOffset={8}>
						<div className="space-y-2">
							<h4 className="font-medium text-sm flex items-center gap-1.5">
								<CircleArrowUp size={18} /> 版本更新提醒
							</h4>
							<div className="text-xs text-muted-foreground whitespace-pre-line">
								{getUpdateMessage}
							</div>
						</div>
					</PopoverContent>
				)}
			</Popover>
		</div>
	)
}
