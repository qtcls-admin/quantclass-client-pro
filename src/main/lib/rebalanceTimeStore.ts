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
import Store from "electron-store"

const rebalanceTimeStore = new Store({ name: "rebalance_time" })

export function getRebalanceTimeConfig(): Record<string, RebTimeConfig> {
	return { ...(rebalanceTimeStore.store as Record<string, RebTimeConfig>) }
}

export function setRebalanceTimeConfig(
	config: Record<string, RebTimeConfig>,
): void {
	rebalanceTimeStore.clear()
	for (const [rebTime, entry] of Object.entries(config)) {
		rebalanceTimeStore.set(rebTime, entry)
	}
}

export { rebalanceTimeStore }
