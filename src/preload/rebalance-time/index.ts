/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import { ipcRenderer } from "electron"

export const rebalanceTimeIPC = {
	getRebalanceTimeConfig: (): Promise<Record<string, RebTimeConfig>> =>
		ipcRenderer.invoke("get-rebalance-time-config"),

	setRebalanceTimeConfig: (
		config: Record<string, RebTimeConfig>,
	): Promise<void> => ipcRenderer.invoke("set-rebalance-time-config", config),
}
