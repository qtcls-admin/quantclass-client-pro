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
	getRebalanceTimeConfig,
	setRebalanceTimeConfig,
} from "@/main/lib/rebalanceTimeStore.js"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import { ipcMain } from "electron"

export function regRebalanceTimeIPC(): void {
	ipcMain.handle("get-rebalance-time-config", () => {
		return getRebalanceTimeConfig()
	})

	ipcMain.handle(
		"set-rebalance-time-config",
		(_event, config: Record<string, RebTimeConfig>) => {
			setRebalanceTimeConfig(config ?? {})
		},
	)

	console.log("[reg] rebalance-time-ipc")
}
