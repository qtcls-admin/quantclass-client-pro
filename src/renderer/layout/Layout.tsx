/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { type FC, useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router"

import {
	useGlobalValue,
	useLifeCycle,
	useNetInterval,
	useNetworkToast,
	useRouterGuard,
} from "@/renderer/hooks"

import { isFullscreenAtom, loadingAnimeAtom } from "@/renderer/store"
import {
	ciccBseNoticeDismissedAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { getBrokerNameByAccountId } from "@/renderer/utils/broker"

import LoadingAnime from "@/renderer/components/LoadingAnime"
import { RealConfigDialog } from "@/renderer/components/RealConfigDialog"
import { useAuthMessageListener } from "@/renderer/hooks/useAuthMessageListener"
import { useCalcTotalWeight } from "@/renderer/hooks/useCalcTotalWeight"
import { useRendererMigrations } from "@/renderer/hooks/useRendererMigrations"
import { MainLoggedOutBanner } from "@/renderer/layout/LoggedOutNotice"
import { NavRail } from "./Content"
import { useNavHotkeysAndSync } from "./Header"
import WindowsBar from "./WindowsBar"
import { useReportErr } from "./hooks/useReportErr"

import { CapWeightMigrateHandler } from "@/renderer/components/CapWeightMigrateHandler"
import { CiccBseNoticeDialog } from "@/renderer/components/CiccBseNoticeDialog"
import { SelectStockMigrateHandler } from "@/renderer/components/SelectStockMigrateHandler"
import { StartupCheckLauncher } from "@/renderer/components/StartupCheckLauncher"
import { AlertDialogProvider } from "@/renderer/context/alert-dialog"
import VersionUpgrade from "@/renderer/layout/version-upgrade"
import { cn } from "@/renderer/lib/utils"
import { useLocalVersions } from "../store/versions"

const { handleToggleFullscreen } = window.electronAPI

interface MainLayoutProps {
	loading: boolean
	content: string | undefined
}

const Layout: FC = () => {
	useGlobalValue()
	useRouterGuard()
	useNetInterval()
	useLifeCycle()
	useCalcTotalWeight()
	useNetworkToast()
	useRendererMigrations()
	useAuthMessageListener()
	useNavHotkeysAndSync()

	const { pathname } = useLocation()
	const [loading] = useAtom(loadingAnimeAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const [ciccDismissed, setCiccDismissed] = useAtom(ciccBseNoticeDismissedAtom)
	const [showCiccNotice, setShowCiccNotice] = useState(false)

	useEffect(() => {
		const accountId = realMarketConfig?.account_id ?? ""
		const isCicc = getBrokerNameByAccountId(accountId) === "中金"
		if (isCicc && !ciccDismissed && accountId) {
			setShowCiccNotice(true)
		}
	}, [realMarketConfig?.account_id, ciccDismissed])
	const setIsFullscreen = useSetAtom(isFullscreenAtom)
	const { content } = useReportErr()

	const { refetchLocalVersions } = useLocalVersions()

	useEffect(() => {
		refetchLocalVersions()
	}, [pathname])

	const toggleFullscreen = () => {
		handleToggleFullscreen()
		setIsFullscreen((prev) => !prev)
	}

	return (
		<div className="flex flex-col h-screen">
			<WindowsBar toggleFullscreen={toggleFullscreen} />

			<div
				className="flex-1 min-h-0 grid"
				style={{ gridTemplateColumns: "64px 1fr" }}
			>
				<NavRail />

				<MainLayout loading={loading} content={content} />
			</div>

			<VersionUpgrade />
			<RealConfigDialog />
			<CapWeightMigrateHandler />
			<SelectStockMigrateHandler />
			<CiccBseNoticeDialog
				open={showCiccNotice}
				onOpenChange={setShowCiccNotice}
				onConfirm={() => setCiccDismissed(true)}
			/>
			<StartupCheckLauncher />
		</div>
	)
}

export default Layout

const MainLayout: FC<MainLayoutProps> = ({ loading, content }) => {
	return (
		<div className="h-full overflow-hidden min-w-0 flex flex-col">
			<MainLoggedOutBanner />
			<LoadingAnime loading={loading} content={content} type="kernalUpdate" />
			<AlertDialogProvider>
				<div className={cn("px-4 min-h-0 overflow-auto flex-1")}>
					<Outlet />
				</div>
			</AlertDialogProvider>
		</div>
	)
}
