/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { LogModal } from "@/renderer/components/logModal"
import MonitorDialog from "@/renderer/components/MonitorDialog"
import { Badge } from "@/renderer/components/ui/badge"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/renderer/components/ui/dropdown-menu"
import { isWindows } from "@/renderer/constant"
import { useHotkeys } from "@/renderer/hooks/useHotkeys"
import { useRealMarketConfig } from "@/renderer/hooks/useRealMarketConfig"
import { useRocketVisible } from "@/renderer/hooks/useRocketVisible"
import { isLogModalOpenAtom, isShowMonitorPanelAtom } from "@/renderer/store"
import { usePlanXAccount } from "@/renderer/hooks/usePlanXAccount"
import { userAtom } from "@/renderer/store/user"
import { getSelectKernal } from "@/shared/lib/permission"
import { useAtom, useAtomValue } from "jotai"
import {
	Blocks,
	DatabaseZap,
	ExternalLink,
	FolderClock,
	Menu,
	Monitor,
	SquareFunction,
	SquareTerminal,
} from "lucide-react"

const { openUserDirectory, openDataDirectory, openDirectory } =
	window.electronAPI

export function LogMenuButton() {
	const { realMarketConfig } = useRealMarketConfig()
	const rocketVisible = useRocketVisible()
	const { permissions } = useAtomValue(userAtom)
	const selectKernal = getSelectKernal(permissions)
	const planXAccount = usePlanXAccount()
	const qmtFolderPath =
		realMarketConfig.qmt_mode === "planA"
			? realMarketConfig.qmt_path
			: planXAccount.qmt_path
	const [isLogModalOpen, setIsLogModalOpen] = useAtom(isLogModalOpenAtom)
	const [isShowMonitorPanel, setIsShowMonitorPanel] = useAtom(
		isShowMonitorPanelAtom,
	)

	useHotkeys([["mod+`", () => setIsLogModalOpen((prev) => !prev)]])

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						title="日志"
						className="relative w-[34px] h-[34px] rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
					>
						<Menu size={18} strokeWidth={1.9} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuItem onClick={() => setIsShowMonitorPanel(true)}>
						<Monitor />
						进程运行状态监控面板
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => setIsLogModalOpen(true)}>
						<SquareTerminal />
						动态日志面板
						{isWindows ? (
							<span className="ml-auto text-[10px] font-mono text-muted-foreground">
								Ctrl+`
							</span>
						) : (
							<span className="ml-auto text-[10px] font-mono text-muted-foreground">
								⌘+`
							</span>
						)}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{qmtFolderPath && (
						<DropdownMenuItem
							onClick={() => openDirectory([qmtFolderPath])}
						>
							<ExternalLink />
							QMT文件夹
						</DropdownMenuItem>
					)}
					{rocketVisible && (
						<DropdownMenuItem
							onClick={() =>
								openDataDirectory(["real_trading", "rocket", "data", "系统日志"])
							}
						>
							<Blocks />
							下单日志
							<Badge className="ml-auto font-mono" variant="secondary">
								rocket
							</Badge>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						onClick={() => openDataDirectory(["real_trading", "logs"])}
					>
						<SquareFunction />
						选股日志
						<Badge className="ml-auto font-mono" variant="secondary">
							{selectKernal}
						</Badge>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => openDataDirectory(["code", "data", "log"])}
					>
						<DatabaseZap />
						数据更新日志
						<Badge className="ml-auto font-mono" variant="secondary">
							fuel
						</Badge>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => openUserDirectory("logs")}>
						<FolderClock />
						客户端日志
						<Badge className="ml-auto" variant="secondary">
							调度
						</Badge>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<LogModal open={isLogModalOpen} onOpenChange={setIsLogModalOpen} />
			{isShowMonitorPanel && <MonitorDialog />}
		</>
	)
}
