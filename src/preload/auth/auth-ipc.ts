/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import windowManager from "@/main/lib/WindowManager.js"
import { tokenStore } from "@/main/lib/tokenStore.js"
import logger from "@/main/utils/wiston.js"
import {
	BBS_BASE_URL,
	PAYMENT_GATEWAY_URL,
	QUANTPAL_BASE_URL,
} from "@/main/vars.js"
import { type BrowserWindow, ipcMain, session, shell } from "electron"

const PAYMENT_CLIENT_WINDOW_ID = "payment-client"
const BBS_PORTAL_WINDOW_ID = "bbs-portal"
const QUANTPAL_PORTAL_WINDOW_ID = "quantpal-portal"

/** 论坛后端按 User-Agent 区分 PC/手机端，需去掉 Electron 标识 */
function getDesktopUserAgent(): string {
	return session.defaultSession
		.getUserAgent()
		.replace(/\s+\S*Electron\/\S+/i, "")
		.replace(/\s+\S*QuantclassClient\/\S+/i, "")
		.trim()
}

function applyUserAgent(win: BrowserWindow, userAgent?: string) {
	if (userAgent) {
		win.webContents.setUserAgent(userAgent)
	}
}

function buildBbsAutoLoginUrl(accessToken: string, redirect = BBS_BASE_URL) {
	const url = new URL(`${BBS_BASE_URL}/user/auto-login`)
	url.searchParams.set("token", accessToken)
	url.searchParams.set("redirect", redirect)
	return url.toString()
}

function buildQuantPalClientLoginUrl(
	accessToken: string,
	redirect = "/backtest/new",
) {
	const url = new URL(
		`${QUANTPAL_BASE_URL.replace(/\/$/, "")}/api/auth/client-login`,
	)
	url.searchParams.set("token", accessToken)
	url.searchParams.set("redirect", redirect)
	return url.toString()
}

function isLoadAbortedError(error: unknown) {
	if (!error || typeof error !== "object") return false

	const err = error as { errno?: number; code?: string; message?: string }
	return (
		err.errno === -3 ||
		err.code === "ERR_ABORTED" ||
		(typeof err.message === "string" && err.message.includes("ERR_ABORTED"))
	)
}

function isRedirectInterruptError(error: unknown) {
	if (isLoadAbortedError(error)) return true
	if (!error || typeof error !== "object") return false

	const err = error as { errno?: number; code?: string; message?: string }
	return (
		err.errno === -100 ||
		err.code === "ERR_CONNECTION_CLOSED" ||
		(typeof err.message === "string" &&
			err.message.includes("ERR_CONNECTION_CLOSED"))
	)
}

async function loadUrlInWindow(
	win: BrowserWindow,
	url: string,
	loadOptions?: Electron.LoadURLOptions,
) {
	try {
		await win.loadURL(url, loadOptions)
	} catch (error) {
		// auto-login 302 跳转时会中断首次导航，窗口会继续自行加载
		if (isRedirectInterruptError(error)) return
		throw error
	}
}

function setupExternalLinkWindowOpenHandler(win: BrowserWindow) {
	win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
		shell.openExternal(targetUrl)
		return { action: "deny" }
	})
}

function setupInternalOriginWindowOpenHandler(
	win: BrowserWindow,
	baseUrl: string,
) {
	const internalOrigin = new URL(baseUrl).origin

	win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
		try {
			const target = new URL(targetUrl)
			if (target.origin === internalOrigin) {
				void loadUrlInWindow(win, targetUrl)
				return { action: "deny" }
			}
		} catch {
			// 非法 URL 走外链逻辑
		}

		shell.openExternal(targetUrl)
		return { action: "deny" }
	})
}

function setupBbsPortalWindowOpenHandler(win: BrowserWindow) {
	setupInternalOriginWindowOpenHandler(win, BBS_BASE_URL)
}

function setupQuantPalPortalWindowOpenHandler(win: BrowserWindow) {
	setupInternalOriginWindowOpenHandler(win, QUANTPAL_BASE_URL)
}

async function openEmbeddedPortalWindow({
	windowId,
	url,
	title,
	loadOptions,
	userAgent,
	setupWindow,
}: {
	windowId: string
	url: string
	title: string
	loadOptions?: Electron.LoadURLOptions
	userAgent?: string
	setupWindow?: (win: BrowserWindow) => void
}) {
	let win = windowManager.getWindowById(windowId)
	if (win && !win.isDestroyed()) {
		setupWindow?.(win)
		applyUserAgent(win, userAgent)
		await loadUrlInWindow(win, url, loadOptions)
		if (win.isMinimized()) win.restore()
		win.show()
		win.focus()
		return { success: true as const }
	}

	win = windowManager.createChildWindow(windowId, {
		width: 960,
		height: 720,
		autoHideMenuBar: true,
		title,
		frame: true,
		titleBarStyle: "default",
		webPreferences: {
			preload: undefined,
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
		},
	})

	setupWindow?.(win)
	applyUserAgent(win, userAgent)
	win.show()
	await loadUrlInWindow(win, url, loadOptions)
	return { success: true as const }
}

// -- 渲染端登录成功后把 access/refresh token 交给主进程统一管理
function setTokensHandler(): void {
	ipcMain.on(
		"auth:set-tokens",
		async (_event, tokens: { access_token: string; refresh_token: string }) => {
			await tokenStore.setTokens(tokens)
		},
	)
}

// -- 渲染端发请求前获取 access_token
function getAccessTokenHandler(): void {
	ipcMain.handle("auth:get-access-token", async () => {
		return await tokenStore.getAccessToken()
	})
}

// -- 渲染端 401 时强制刷新一次 access_token
function forceRefreshHandler(): void {
	ipcMain.handle("auth:force-refresh", async () => {
		return await tokenStore.getAccessToken({ force: true })
	})
}

// -- 渲染端登出 IPC
function logoutHandler(): void {
	ipcMain.handle("auth:logout", async () => {
		await tokenStore.logout()
	})
}

// -- 在内嵌 BrowserWindow 中打开支付平台页面
function openPaymentClientPortalHandler(): void {
	ipcMain.handle(
		"auth:open-payment-client-portal",
		async (_event, clientPath?: string) => {
			const accessToken = await tokenStore.getAccessToken()
			if (!accessToken) {
				return { success: false, message: "请先登录" }
			}

			const path =
				typeof clientPath === "string" && clientPath.startsWith("/")
					? clientPath
					: "/client"
			const url = `${PAYMENT_GATEWAY_URL.replace(/\/$/, "")}${path}`
			const extraHeaders = `Authorization: Bearer ${accessToken}\r\n`

			try {
				return await openEmbeddedPortalWindow({
					windowId: PAYMENT_CLIENT_WINDOW_ID,
					url,
					title: "支付中心",
					loadOptions: { extraHeaders },
					setupWindow: (win) =>
						setupInternalOriginWindowOpenHandler(win, PAYMENT_GATEWAY_URL),
				})
			} catch (error) {
				logger.error(
					`[auth-ipc] 打开支付客户端失败: ${error instanceof Error ? error.message : String(error)}`,
				)
				windowManager.closeWindow(PAYMENT_CLIENT_WINDOW_ID)
				return {
					success: false,
					message: "打开支付页面失败，请稍后重试",
				}
			}
		},
	)
}

function openBbsPortalHandler(): void {
	ipcMain.handle(
		"auth:open-bbs-portal",
		async (_event, redirect?: string) => {
			const accessToken = await tokenStore.getAccessToken()
			if (!accessToken) {
				return { success: false, message: "请先登录" }
			}

			const url = buildBbsAutoLoginUrl(accessToken, redirect ?? BBS_BASE_URL)

			try {
				return await openEmbeddedPortalWindow({
					windowId: BBS_PORTAL_WINDOW_ID,
					url,
					title: "量化论坛",
					userAgent: getDesktopUserAgent(),
					setupWindow: setupBbsPortalWindowOpenHandler,
				})
			} catch (error) {
				logger.error(
					`[auth-ipc] 打开量化论坛失败: ${error instanceof Error ? error.message : String(error)}`,
				)
				windowManager.closeWindow(BBS_PORTAL_WINDOW_ID)
				return {
					success: false,
					message: "打开量化论坛失败，请稍后重试",
				}
			}
		},
	)
}

function openQuantPalPortalHandler(): void {
	ipcMain.handle(
		"auth:open-quantpal-portal",
		async (_event, redirect?: string) => {
			const accessToken = await tokenStore.getAccessToken()
			if (!accessToken) {
				return { success: false, message: "请先登录" }
			}

			const url = buildQuantPalClientLoginUrl(
				accessToken,
				redirect ?? "/backtest/new",
			)

			try {
				return await openEmbeddedPortalWindow({
					windowId: QUANTPAL_PORTAL_WINDOW_ID,
					url,
					title: "量搭子 · QuantPal",
					setupWindow: setupQuantPalPortalWindowOpenHandler,
				})
			} catch (error) {
				logger.error(
					`[auth-ipc] 打开量搭子失败: ${error instanceof Error ? error.message : String(error)}`,
				)
				windowManager.closeWindow(QUANTPAL_PORTAL_WINDOW_ID)
				return {
					success: false,
					message: "打开量搭子失败，请稍后重试",
				}
			}
		},
	)
}

export const regAuthIPC = () => {
	setTokensHandler()
	getAccessTokenHandler()
	forceRefreshHandler()
	logoutHandler()
	openPaymentClientPortalHandler()
	openBbsPortalHandler()
	openQuantPalPortalHandler()
	console.log("[reg] auth-ipc")
}
