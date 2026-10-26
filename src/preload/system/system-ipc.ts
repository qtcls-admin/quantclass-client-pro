/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getAppAndKernalVersions } from "@/main/core/lib.js"
import { checkRemoteVersions, updateKernal } from "@/main/core/runpy.js"
import windowManager from "@/main/lib/WindowManager.js"
import { process_manager } from "@/main/lib/process.js"
import { killAllKernalByForce, killKernalByForce } from "@/main/utils/tools.js"
import { log } from "@/main/utils/wiston.js"
import type { KernalType } from "@/shared/types/index.js"
import { electronApp, platform } from "@electron-toolkit/utils"
import { app, ipcMain } from "electron"
import nodeMachineId from "node-machine-id"

const { machineIdSync } = nodeMachineId

async function handleToggleFullscreen() {
	ipcMain.handle("toggle-fullscreen", async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			win.isMaximized() ? win.unmaximize() : win.maximize()
		}
	})
}

async function handleSetAutoLogin() {
	ipcMain.handle("set-is-auto-login", async (_event, auto: boolean) => {
		if (platform.isMacOS) {
			electronApp.setAutoLaunch(auto)
		}
		if (platform.isWindows) {
			app.setLoginItemSettings({
				openAtLogin: auto,
			})
		}
	})
}

function handleMinimize() {
	ipcMain.handle("minimize-app", async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			// mw.focus()
			win.minimize()
		}
	})
}

function handleClose() {
	ipcMain.handle("close-app", async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		if (win) {
			win.close()
		}
	})
}

function fetchFullscreenState() {
	ipcMain.handle("fetch-fullscreen-state", async (_event, key = "main") => {
		const win = windowManager.getWindowById(key)

		return win ? win.isMaximized() : false
	})
}

function handleMonitorProcess() {
	ipcMain.handle("fetch-monitor-processes", async () => {
		return process_manager.getRunningProcesses()
	})
}

function handleCheckKernalRunning() {
	ipcMain.handle(
		"check-kernal-running",
		async (_event, kernals: KernalType[] = ["rocket"]) => {
			const { isAnyKernalBusy } = await import("@/main/utils/tools.js")
			return await isAnyKernalBusy(kernals)
		},
	)
}

function handleKillProcess() {
	ipcMain.handle("kill-process", async (_event, pid: number) => {
		return await process_manager.killProcess(pid)
	})
}

function handleKillAllKernals() {
	ipcMain.handle("kill-all-kernals", async (_event, byForce = false) => {
		return await killAllKernalByForce(byForce)
	})
}

function handleKillKernal() {
	ipcMain.handle(
		"kill-kernal",
		async (_event, kernal: KernalType, byForce = false) => {
			return await killKernalByForce(kernal, byForce)
		},
	)
}

function handleRendererLog() {
	ipcMain.handle(
		"do-renderer-log",
		async (_event, type: "info" | "error" | "warning", msg: string) => {
			log(type, `[Renderer] ${msg}`)
		},
	)
}

function handleRestartApp() {
	ipcMain.handle("restart-app", async () => {
		const mainWindow = windowManager.getWindow()
		if (mainWindow) {
			mainWindow.removeAllListeners()
			mainWindow.destroy()
		}
		app.relaunch()
		app.quit()
	})
}

async function handleCheckUpdate(): Promise<void> {
	ipcMain.handle("check-update", async (_event, now = true) => {
		return await checkRemoteVersions(now)
	})
}

async function handleGetAppAndKernalVersions(): Promise<void> {
	ipcMain.handle("get-app-and-kernal-versions", async () => {
		return await getAppAndKernalVersions()
	})
}

async function handleUpdateKernal(): Promise<void> {
	ipcMain.handle(
		"update-kernal",
		async (_event, name: KernalType, targetVersion?: string) => {
			return await updateKernal(name as KernalType, targetVersion)
		},
	)
}

function handleGetMachineId() {
	ipcMain.handle("get-machine-id", () => {
		return machineIdSync()
	})
}

export const regSystemIPC = () => {
	handleClose()
	handleMinimize()
	handleRendererLog()
	handleKillProcess()
	handleKillAllKernals()
	handleKillKernal()
	handleSetAutoLogin()
	fetchFullscreenState()
	handleMonitorProcess()
	handleCheckKernalRunning()
	handleToggleFullscreen()
	handleRestartApp()
	handleGetAppAndKernalVersions()
	handleUpdateKernal()
	handleCheckUpdate()
	handleGetMachineId()
	console.log("[reg] system-ipc")
}
