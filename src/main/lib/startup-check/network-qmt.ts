/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { runFuelProbe } from "@/main/lib/startup-check/fuel-probe.js"
import logger from "@/main/utils/wiston.js"
import { platform } from "@electron-toolkit/utils"

export interface StartupCheckResult {
	ok: boolean
	message: string
	durationMs: number
	detail?: string
}

const NETWORK_PROBE_URL = "https://www.baidu.com"
const NETWORK_TIMEOUT_MS = 5000

// -- 使用 fetch + AbortController 实现带超时的 HTTPS 请求
async function fetchWithTimeout(
	url: string,
	timeoutMs: number,
): Promise<{ ok: boolean; status?: number; error?: string }> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const res = await fetch(url, {
			method: "HEAD",
			signal: controller.signal,
			redirect: "follow",
		})
		return { ok: res.ok || res.status > 0, status: res.status }
	} catch (e) {
		const err = e as Error
		const isAbort = err.name === "AbortError"
		return {
			ok: false,
			error: isAbort ? `请求超时（>${timeoutMs}ms）` : err.message,
		}
	} finally {
		clearTimeout(timer)
	}
}

// -- 网络连通性探测
export async function checkNetworkConnectivity(): Promise<StartupCheckResult> {
	const start = Date.now()

	const httpRes = await fetchWithTimeout(NETWORK_PROBE_URL, NETWORK_TIMEOUT_MS)
	const durationMs = Date.now() - start

	if (httpRes.ok) {
		const detail = `HTTPS ${NETWORK_PROBE_URL} 状态码 ${httpRes.status ?? "?"}`
		logger.info(`[startup-check] 网络检测通过：${detail}，耗时 ${durationMs}ms`)
		return {
			ok: true,
			message: "网络连接正常",
			detail,
			durationMs,
		}
	}

	const detail =
		httpRes.error ?? `HTTPS 请求失败（状态 ${httpRes.status ?? "?"}）`
	logger.error(`[startup-check] 网络检测失败：${detail}`)
	return {
		ok: false,
		message: "网络连接异常，请检查网络后重试",
		detail,
		durationMs,
	}
}

// -- QMT 连通性探测，根据退出码判定连通性
const QMT_PROBE_TIMEOUT_MS = 10_000

export async function checkQmtConnect(): Promise<StartupCheckResult> {
	const start = Date.now()

	if (!platform.isWindows) {
		const durationMs = Date.now() - start
		logger.info("[startup-check] 非 Windows 平台，QMT 连通性视为未通过")
		return {
			ok: false,
			message: "QMT 连通性未通过",
			detail: "QMT 仅支持 Windows 平台，当前环境无法完成连通性检测",
			durationMs,
		}
	}

	const probe = await runFuelProbe(["qmt_connect_check"], {
		timeoutMs: QMT_PROBE_TIMEOUT_MS,
	})
	const durationMs = Date.now() - start

	// -- 内核未安装 / spawn 失败 / 超时
	if (probe.code < 0) {
		const detail = probe.error ?? "fuel 探测失败"
		logger.error(`[startup-check] QMT 探测异常：${detail}`)
		return {
			ok: false,
			message: "QMT 探测无法执行",
			detail,
			durationMs,
		}
	}

	switch (probe.code) {
		case 0: {
			const detail = `fuel qmt_connect_check exit 0（耗时 ${probe.durationMs}ms）`
			logger.info(`[startup-check] QMT 连通性检测通过：${detail}`)
			return {
				ok: true,
				message: "QMT 连通性正常",
				detail,
				durationMs,
			}
		}
		case 1: {
			const detail =
				"QMT 连接或订阅失败，请确认 QMT 客户端已启动"
			logger.warn(`[startup-check] QMT 连通性检测未通过：${detail}`)
			return {
				ok: false,
				message: "QMT 连接或订阅失败",
				detail,
				durationMs,
			}
		}
		case 2: {
			const detail =
				"实盘配置缺少 qmt_path 或 account_id，请在「实盘设置」中完成配置"
			logger.warn(`[startup-check] QMT 配置缺失：${detail}`)
			return {
				ok: false,
				message: "实盘配置不完整",
				detail,
				durationMs,
			}
		}
		default: {
			const detail = `fuel qmt_connect_check 返回未知退出码 ${probe.code}`
			logger.error(`[startup-check] QMT 检测异常：${detail}`)
			return {
				ok: false,
				message: "QMT 检测异常",
				detail,
				durationMs,
			}
		}
	}
}
