/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { KernalType } from "@/shared/types/kernal.js"
import { ipcRenderer } from "electron"

export const systemIPC = {
	// 进程控制
	handleKillProcess: (pid: number) => ipcRenderer.invoke("kill-process", pid),
	killAllKernals: (byForce = false) =>
		ipcRenderer.invoke("kill-all-kernals", byForce),
	killKernal: (kernal: KernalType, byForce = false) =>
		ipcRenderer.invoke("kill-kernal", kernal, byForce),

	// 全屏控制
	handleToggleFullscreen: (key = "main") =>
		ipcRenderer.invoke("toggle-fullscreen", key),
	fetchFullscreenState: (key?: string) =>
		ipcRenderer.invoke("fetch-fullscreen-state", key),

	// 窗口控制 - 从renderer/ipc/system.ts迁移
	createTerminalWindow: () => ipcRenderer.invoke("create-terminal-window"),
	focusMainWindows: () => ipcRenderer.invoke("focus-main-windows"),
	closeApp: (key = "main") => ipcRenderer.invoke("close-app", key),
	minimizeApp: (key = "main") => ipcRenderer.invoke("minimize-app", key),
	restartApp: () => ipcRenderer.invoke("restart-app"),

	// 系统配置
	setAutoLaunch: (auto: boolean) =>
		ipcRenderer.invoke("set-is-auto-login", auto),
	// 版本管理
	checkUpdate: (now = true) => ipcRenderer.invoke("check-update", now),
	updateKernal: (name: KernalType, targetVersion?: string) =>
		ipcRenderer.invoke("update-kernal", name, targetVersion),
	getAppAndKernalVersions: () =>
		ipcRenderer.invoke("get-app-and-kernal-versions"),

	// 系统信息
	getMacAddress: () => ipcRenderer.invoke("get-mac-address"),
	getMachineId: () => ipcRenderer.invoke("get-machine-id") as Promise<string>,
	// 检查内核是否运行
	checkKernalRunning: (kernals: KernalType[] = ["rocket"]) =>
		ipcRenderer.invoke("check-kernal-running", kernals) as Promise<boolean>,
}
