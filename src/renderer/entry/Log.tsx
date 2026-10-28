/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// import { isWindows } from "@/renderer/constant"
import { useTerminalStoreHydration } from "@/renderer/hooks/useTerminalStoreHydration"
import LogWindowBar from "@/renderer/entry/LogWindowBar"
import { LogDashboard } from "../components/logModal"

export default function Log() {
	useTerminalStoreHydration()

	return (
		<div className="h-screen w-screen flex flex-col overflow-hidden">
			<LogWindowBar />
			<LogDashboard
				isShowTitle={false}
				isShowExternal={false}
				textSize="text-sm"
				isIndependentWindow={true}
			/>
		</div>
	)
}
