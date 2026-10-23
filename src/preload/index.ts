/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { systemIPC } from "@/preload/system/index.js"
import { contextBridge } from "electron"
import { authIPC } from "./auth/index.js"
import { dataIPC } from "./data/index.js"
import { emitterIPC } from "./emitter/index.js"
import { fileSysIPC } from "./file-sys/index.js"
import { kernelLogIPC } from "./kernel-log/index.js"
import { migrationIPC } from "./migration/index.js"
import { notificationIPC } from "./notification/index.js"
import { realTradingBackupIPC } from "./real-trading-backup/index.js"
import { rebalanceTimeIPC } from "./rebalance-time/index.js"
import { repoIPC } from "./repo/index.js"
import { startupCheckIPC } from "./startup-check/index.js"
import { storeIPC } from "./store/index.js"
import { strategyIPC } from "./strategy/index.js"
import { userIPC } from "./user/index.js"

import { electronAPI } from "@electron-toolkit/preload"
import { coreIPC } from "./core/index.js"

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI)
		contextBridge.exposeInMainWorld("electronAPI", {
			...coreIPC,
			...storeIPC,
			...rebalanceTimeIPC,
			...dataIPC,
			...strategyIPC,
			...fileSysIPC,
			...kernelLogIPC,
			...emitterIPC,
			...systemIPC,
			...userIPC,
			...migrationIPC,
			...authIPC,
			...notificationIPC,
			...realTradingBackupIPC,
			...repoIPC,
			...startupCheckIPC,
		})
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronAPI
	// @ts-ignore (define in dts)
	window.api = api
}

contextBridge.exposeInMainWorld("versions", {
	node: () => process.versions.node,
	chrome: () => process.versions.chrome,
	electron: () => process.versions.electron,
})
