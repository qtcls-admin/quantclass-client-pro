/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { ipcRenderer } from "electron"

export const authIPC = {
	// -- 渲染端登录成功后把 access/refresh token 交给主进程统一管理
	setTokens: (tokens: { access_token: string; refresh_token: string }) =>
		ipcRenderer.send("auth:set-tokens", tokens),

	// -- 渲染端请求前获取 access_token
	getAccessToken: (): Promise<string | null> =>
		ipcRenderer.invoke("auth:get-access-token"),

	// -- 渲染端 401 时强制刷新一次 access_token
	forceRefreshAccessToken: (): Promise<string | null> =>
		ipcRenderer.invoke("auth:force-refresh"),

	// -- 渲染端登出 IPC
	logoutAuth: (): Promise<void> => ipcRenderer.invoke("auth:logout"),

	// -- 在内嵌窗口打开支付平台页面
	openPaymentClientPortal: (
		clientPath?: string,
	): Promise<{
		success: boolean
		message?: string
	}> => ipcRenderer.invoke("auth:open-payment-client-portal", clientPath),

	// -- 在内嵌窗口打开量化论坛（token 通过 URL 传递）
	openBbsPortal: (
		redirect?: string,
	): Promise<{
		success: boolean
		message?: string
	}> => ipcRenderer.invoke("auth:open-bbs-portal", redirect),

	// -- 在内嵌窗口打开量搭子 QuantPal（token 通过 URL 传递）
	openQuantPalPortal: (
		redirect?: string,
	): Promise<{
		success: boolean
		message?: string
	}> => ipcRenderer.invoke("auth:open-quantpal-portal", redirect),

	// -- 渲染端订阅主进程推送的会话失效事件
	onSessionInvalid: (cb: () => void): (() => void) => {
		const listener = () => cb()
		ipcRenderer.on("auth:session-invalid", listener)
		return () => {
			ipcRenderer.removeListener("auth:session-invalid", listener)
		}
	},
}
