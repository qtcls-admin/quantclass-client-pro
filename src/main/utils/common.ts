/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { exec } from "node:child_process"
import { existsSync } from "node:fs"
import fs from "node:fs/promises"
// import { arch } from "node:os"
import path from "node:path"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import {
	normalizeTradingDateToYmd,
	sortUniqueTradingDaysYmd,
} from "@/shared/lib/trading-day.js"
import { platform } from "@electron-toolkit/utils"
import { app } from "electron"
import { getTradingCalendar } from "etc-csv-napi"

export const WINDOW_HEIGHT = 720
export const WINDOW_WIDTH = 1280
export const WINDOW_MIN_HEIGHT = 600
export const WINDOW_MIN_WIDTH = 980

export const isDev = !app.isPackaged

export const MAIN_MSG_CODE = {
	// 更新通知
	UPDATE_NOTICE: 500,
	// 更新不可用/已是最新
	UPDATE_NOT_AVAILABLE: 501,
	// 安装失败
	UPDATE_INSTALL_FAILED: 502,
	// 更新下载完毕，提示安装更新
	UPDATE_DOWNLOAD_FINISH: 503,
	// 回测使用代码
	BACKTEST_CODE: 504,
	// 计算交易计划
	CALC_TRADING_PLAN: 600,
	// Real Trading 正在运行中
	REAL_TRADING_RUNNING: 700,
}

export enum Channels {
	// app updater
	AppUpdaterConfirm = "AppUpdaterConfirm",
	AppUpdaterProgress = "AppUpdaterProgress",
	AppUpdaterAbort = "AppUpdaterAbort",
}

/**
 * 获取内核路径
 * @param kernel 内核名称
 * @returns 内核路径
 */
export const getKernalPath = async (kernel: string) => {
	const codePath = await store.getAllDataPath("code", true)
	let kernalPath: string = path.join(codePath, kernel, kernel)

	if (platform.isWindows) {
		kernalPath = `${kernalPath}.exe`
	} else {
		exec(`chmod +x ${kernalPath}`)
	}

	if (existsSync(kernalPath)) {
		try {
			await fs.chmod(kernalPath, 0o755)
		} catch (error) {
			logger.error(`[getKernalPath]: ${kernalPath} 内核权限设置失败: ${error}`)
		}
	}

	return path.normalize(kernalPath)
}

/**
 * 清理旧的内核
 * @param kernel 内核名称
 * @returns 旧的内核路径
 */
export const clearOldKernal = async (kernel: string) => {
	const codePath = await store.getAllDataPath("code", true)
	let kernalPath: string = path.join(codePath, kernel)

	if (platform.isWindows) {
		kernalPath = `${kernalPath}.exe`
	}

	if (existsSync(kernalPath)) {
		try {
			await fs.unlink(kernalPath)
		} catch (error) {
			logger.error(`[delKernal]: ${kernalPath} 删除失败: ${error}`)
		}
	}

	return path.normalize(kernalPath)
}

export const tradingCalender = async () => {
	if (platform.isWindows) {
		const periodOffsetPath = await store.getAllDataPath(
			"period_offset.csv",
			false,
		)

		// -- 动态导入，只在需要时加载
		const { getTradingCalendar } = await import("etc-csv-napi")

		return getTradingCalendar(periodOffsetPath)
	}

	return []
}
// -- 读取交易日列表，文件缺失或读失败返回 []。
export async function loadTradingDaysFromPeriodOffsetCsv(
	options: {
		// -- 默认：all_data_path/period_offset.csv
		filePath?: string
	} = {},
): Promise<string[]> {
	const filePath =
		options.filePath ?? (await store.getAllDataPath("period_offset.csv", false))

	if (!filePath || !existsSync(filePath)) {
		logger.warn(`[period-offset] period_offset.csv 不存在: ${filePath ?? ""}`)
		return []
	}

	try {
		const raw = await getTradingCalendar(filePath)
		const ymds = raw
			.map((s) => normalizeTradingDateToYmd(s))
			.filter((x): x is string => x !== null)
		return sortUniqueTradingDaysYmd(ymds)
	} catch (e) {
		logger.error(`[period-offset] 读取 period_offset.csv 失败: ${e}`)
		return []
	}
}
