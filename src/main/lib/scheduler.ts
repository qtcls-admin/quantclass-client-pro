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
import { execBin } from "@/main/lib/process.js"
import { writeRealMarket25 } from "@/main/lib/real-market-25.js"
import { userStore } from "@/main/lib/userStore.js"
import { loadTradingDaysFromPeriodOffsetCsv } from "@/main/utils/common.js"
import {
	isAnyKernalBusy,
	isKernalBusy,
	isTradingTime,
	killKernalByForce,
} from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { checkPermission, getSelectKernal } from "@/shared/lib/permission.js"
import {
	getLocalCalendarYmd,
	isLocalYmdTradingDayInCalendar,
} from "@/shared/lib/trading-day.js"
import type { UserAccount } from "@/shared/types/user.js"
import { platform } from "@electron-toolkit/utils"
import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween.js"
import Store from "electron-store"
import schedule from "node-schedule"

const _store = new Store()

dayjs.extend(isBetween)

// -- 将状态相关的常量和类型定义集中管理
interface SystemState {
	isSetAutoUpdate: boolean
	isSetAutoTrading: boolean
	isSetAutoMinData: boolean
	job: schedule.Job | null
	minDataJob: schedule.Job | null
	minDataMode: "fast" | "stable"
	isOnline: boolean
}

// -- 系统状态
const systemState: SystemState = {
	isSetAutoUpdate: false,
	isSetAutoTrading: false,
	isSetAutoMinData: false,
	job: null,
	minDataJob: null,
	minDataMode: "fast",
	isOnline: true,
}

/**
 * 初始化系统状态
 */
async function initializeSystem() {
	try {
		// -- 非 Windows 平台到此结束
		if (!platform.isWindows) return

		// 强制更新用户信息
		const userInfo = await userStore.getUserAccount(true)

		// 若未获取到或没有分享会/股票权限则 return
		if (!checkPermission(userInfo?.permissions ?? [], "isMember", "isStock")) {
			return
		}
	} catch (error) {
		logger.error(`系统初始化失败: ${error}`)
		throw error // -- 向上抛出错误，让调用方处理
	}
}

/**
 * 取消定时任务
 */
const cancelScheduler = () => {
	logger.info("[scheduler] 取消定时任务")
	if (systemState.job !== null) {
		systemState.job.cancel()
		systemState.job = null
	}
}

/**
 * 获取当前15分钟时间，格式为 "HH:mm"，如 "00:00"、"00:15"
 */
function getCurrent15m(): string {
	const now = dayjs()
	const hour = now.hour().toString().padStart(2, "0")
	const minute = Math.floor(now.minute() / 15) * 15
	const minuteStr = minute.toString().padStart(2, "0")
	return `${hour}:${minuteStr}`
}

/**
 * 启动定时任务
 */
const setupScheduler = async (): Promise<schedule.Job> => {
	// -- 重置已存在的调度任务
	cancelScheduler()
	const mw = windowManager.getWindow()
	try {
		mw?.webContents.send("send-schedule-status", "init")
		await initializeSystem()
	} catch (error) {
		mw?.webContents.send("send-schedule-status", "error")
		throw error
	}

	/**
	 * 定时任务：每分钟执行一次
	 * - 检查网络状态
	 * - 检查用户登录状态
	 * - 唤醒 Rocket
	 * - 唤醒 Fuel
	 * - 唤醒 Fusion
	 */
	systemState.job = schedule.scheduleJob("* * * * *", async () => {
		logger.info(">>>>>>>>>>>>>>>> scheduler start <<<<<<<<<<<<<<<<")
		const userAccount = await userStore.getUserAccount() // -- 获取用户状态
		const allowConcurrentFuelTasks = isTradingTime()

		mw?.webContents.send("send-schedule-status", "start")
		logger.info(
			`[scheduler] 自动数据: ${systemState.isSetAutoUpdate}, 自动下单: ${systemState.isSetAutoTrading}, 在线: ${systemState.isOnline}, 用户登录: ${userAccount?.isLoggedIn}`,
		)

		// -- 检查网络状态
		if (!systemState.isOnline) {
			logger.info("[network] 网络离线，跳过本轮调度")
			mw?.webContents.send("send-schedule-status", "outline")
			return
		}

		// -- 检查用户登录：未登录直接返回
		if (!userAccount?.isLoggedIn) {
			logger.info("[user] 用户未登录，跳过本轮调度")
			return
		}

		try {
			await writeRealMarket25(userAccount.permissions)
		} catch (error) {
			logger.error(`[real_market_25] 写入失败: ${error}`)
		}

		// 2025-05-29，目前仍然只支持Windows系统下单，mac 上最多支持手动回测
		const requireTrading = systemState.isSetAutoTrading && platform.isWindows

		// -- 检查是否设置自动更新数据，如果设置了，唤醒 Rocket
		if (requireTrading) {
			await wakeUpRocket(userAccount, mw)
		}

		const selectKernal = getSelectKernal(userAccount?.permissions ?? [])
		if (
			await isAnyKernalBusy(
				allowConcurrentFuelTasks ? [selectKernal] : [selectKernal, "fuel"],
			)
		) {
			logger.info("[scheduler] 内核正忙，跳过本轮调度")
			return
		}

		// -- 当设置自动更新数据的时候，自动唤醒Fuel

		if (systemState.isSetAutoUpdate) {
			// -- 获取定时任务时间
			const dataModuleTimes = (await _store.get(
				"schedule.dataModule",
				[],
			)) as string[]
			const dataModuleAuto = dataModuleTimes.length === 0
			const current15m = getCurrent15m()
			const isScheduleDataModule =
				dataModuleAuto || dataModuleTimes.includes(current15m)
			logger.info(
				`[scheduler-fuel] 数据模块定时任务: ${dataModuleTimes}, 当前时间: ${current15m}, 是否更新: ${isScheduleDataModule}`,
			)
			const isFuelBusy = await isKernalBusy("fuel")
			if (isFuelBusy && !allowConcurrentFuelTasks) {
				logger.info("[fuel] 内核正忙，跳过本轮调度")
			} else if (!isScheduleDataModule) {
				logger.info("[fuel] 非定时更新数据时间，跳过本轮数据更新")
			} else {
				await wakeUpFuel(mw)
			}
		}

		// -- 当设置自动下单的时候，自动唤醒Fusion
		if (requireTrading) {
			// -- 获取定时任务时间
			const selectModuleTimes = (await _store.get(
				"schedule.selectModule",
				[],
			)) as string[]
			const selectModuleAuto = selectModuleTimes.length === 0
			const current15m = getCurrent15m()
			const isScheduleSelectModule =
				selectModuleAuto || selectModuleTimes.includes(current15m)
			logger.info(
				`[scheduler-select] 选股模块定时任务: ${selectModuleTimes}, 当前时间: ${current15m}, 是否更新: ${isScheduleSelectModule}`,
			)

			if (await isKernalBusy(selectKernal)) {
				logger.info(`[${selectKernal}] 内核正忙，跳过本轮调度`)
			} else if (!isScheduleSelectModule) {
				logger.info(`[${selectKernal}] 非定时选股时间，跳过本轮选股`)
			} else {
				await wakeUpFusion(userAccount, mw)
			}
		} else {
			logger.info("[scheduler] 未启用自动实盘或者非Windows系统，跳过本轮调度")
		}
		mw?.webContents.send("send-schedule-status", "done")
		logger.info(">>>>>>>>>>>>>>>> scheduler done <<<<<<<<<<<<<<<<")
	})

	return systemState.job
}

// -- 处理自动更新逻辑
async function wakeUpFuel(mw) {
	try {
		logger.info("[fuel] 自动更新所有数据...")
		mw?.webContents.send("send-schedule-status", "fuel_start")
		await execBin(["all_data"], "自动更新所有数据")
	} catch (error) {
		logger.info(`[scheduler] runtime error(${error})`)
	} finally {
	}
}

async function wakeUpFusion(userAccount: UserAccount, mw) {
	const permissions = userAccount?.permissions ?? []
	if (
		!checkPermission(permissions, "isMember", "isStock") ||
		!platform.isWindows
	) {
		logger.info(`[select] 无分享会或股票权限，跳过选股，${userAccount?.user}`)
		return
	}
	const selectKernal = getSelectKernal(permissions)
	try {
		mw?.webContents.send("send-schedule-status", `${selectKernal}_start`)
		await execBin(["select", "trading"], "选股", selectKernal)
	} catch (error) {
		logger.info(`[${selectKernal}] runtime error(${error})`)
	} finally {
	}
}

// -- 处理实盘交易逻辑
async function wakeUpRocket(userAccount: UserAccount, mw) {
	const qmtMode = _store.get("real_market_config.qmt_mode", "planX")
	const qmtConnectOk = _store.get("qmt_connect_ok", false) === true
	if (qmtMode !== "planA" || !qmtConnectOk) {
		return
	}

	// TODO: 启动之前，要检查以下QMT的设置是否OK
	// -- 非 Windows 或非会员用户跳过实盘逻辑
	if (!platform.isWindows) {
		logger.info("[rocket] 非 Windows 系统，Rocket无法自动下单")
		return
	}

	if (_store.get("real_market_config.account_id", "0") === "0") {
		logger.info("[rocket] QMT账号为0，激活手动下单模式，不启动Rocket")
		if (await isKernalBusy("rocket")) {
			logger.info("[rocket] Rocket正在运行，强制杀死")
			await killKernalByForce("rocket")
		}
		return
	}

	if (!checkPermission(userAccount?.permissions ?? [], "isMember", "isStock")) {
		logger.info(`[trade] 无分享会或股票权限，跳过Rocket，${userAccount?.user}`)
		return
	}

	// -- 交易条件检查
	const shouldWakeUp = isTradingTime()
	if (!shouldWakeUp) {
		logger.info("[rocket] 非交易日，不唤醒Rocket")
		mw?.webContents.send("send-schedule-status", "noTradingTime")
		// await new Promise((resolve) => setTimeout(resolve, 10000))
		return
	}
	// -- 启动 rocket
	mw?.webContents.send("send-schedule-status", "rocket_start")
	await startRocketIfNeeded()
}

// -- 启动 rocket 服务
async function startRocketIfNeeded() {
	logger.info("[rocket] 交易时间，确认 rocket 状态")
	const rocketBusy = await isKernalBusy("rocket")
	if (!rocketBusy) {
		try {
			await execBin(["run"], "启动 rocket", "rocket")
		} catch (e) {
			logger.error(`[rocket] 异常 ${e}`)
		}
	} else {
		logger.warn("[rocket] 已在运行中，跳过操作")
	}
}

/**
 * 切换定时任务状态，前端启动或者停止定时任务的函数
 * @param {Boolean} isOn - 是否启用定时任务
 */
const setAutoUpdate = (isOn: boolean) => {
	systemState.isSetAutoUpdate = isOn
	logger.info(`[fuel] 自动更新数据: ${systemState.isSetAutoUpdate}`)

	// -- 如果关闭自动更新，取消定时任务
	if (!isOn) {
		cancelScheduler()
		return
	}

	// -- 启动定时任务
	try {
		// -- 启动新的任务
		setupScheduler() // -- 调用 schedule 主进程
	} catch (error) {
		// -- schedule 启动失败
		systemState.isSetAutoUpdate = false
		const mainWindow = windowManager.getWindow()
		mainWindow?.webContents.send(
			"send-update-status",
			systemState.isSetAutoUpdate,
		)
		logger.error(
			`[fuel] 设置自动更新失败: ${systemState.isSetAutoUpdate}, 错误(${error})`,
		)
	}
}

const setAutoTrading = (isOn: boolean) => {
	// TODO: 启动之前，要检查以下QMT的设置是否OK
	systemState.isSetAutoTrading = isOn
	logger.info(`[trade] 自动交易: ${systemState.isSetAutoTrading}`) // -- 记录日志

	_store.set("auto_real_trading", systemState.isSetAutoTrading) // -- 保存到本地

	// -- 如果启动实盘，自动更新也要开启
	if (systemState.isSetAutoTrading) {
		!systemState.isSetAutoUpdate && setAutoUpdate(true) // -- 如果自动交易开启，自动更新也要开启
	}
}

// ============================================================================
// 实时数据（min data）定时任务
// ============================================================================

function isMinDataIntradayWindow(now = dayjs()): boolean {
	const timeInMinutes = now.hour() * 60 + now.minute()
	const isMorning =
		timeInMinutes >= 9 * 60 + 16 && timeInMinutes <= 11 * 60 + 26
	const isAfternoon =
		timeInMinutes >= 13 * 60 + 1 && timeInMinutes <= 15 * 60 + 1
	return isMorning || isAfternoon
}

async function shouldRunMinDataSchedule(): Promise<
	{ run: true } | { run: false; message: string }
> {
	if (!isMinDataIntradayWindow()) {
		return { run: false, message: "[min-data] 非交易时段，跳过本轮" }
	}

	const calendar = await loadTradingDaysFromPeriodOffsetCsv()
	if (calendar.length === 0) {
		return {
			run: false,
			message: "[min-data] 未读到 period_offset.csv 交易日历，跳过本轮",
		}
	}

	const ymd = getLocalCalendarYmd(new Date())
	if (!isLocalYmdTradingDayInCalendar(calendar, ymd)) {
		return {
			run: false,
			message: `[min-data] 今日 ${ymd} 非交易日，跳过本轮`,
		}
	}

	return { run: true }
}

const cancelMinDataScheduler = () => {
	if (systemState.minDataJob !== null) {
		systemState.minDataJob.cancel()
		systemState.minDataJob = null
	}
}

async function wakeUpMinData() {
	const mw = windowManager.getWindow()

	const scheduleCheck = await shouldRunMinDataSchedule()
	if (!scheduleCheck.run) {
		logger.info(scheduleCheck.message)
		return
	}

	const userAccount = await userStore.getUserAccount()
	const allowConcurrentFuelTasks = isTradingTime()

	if (!systemState.isOnline) {
		logger.info("[min-data] 网络离线，跳过本轮")
		mw?.webContents.send("min-data-schedule-status", {
			type: "skipped",
			reason: "offline",
		})
		return
	}

	if (!userAccount?.isLoggedIn) {
		logger.info("[min-data] 用户未登录，跳过本轮")
		mw?.webContents.send("min-data-schedule-status", {
			type: "skipped",
			reason: "unauthorized",
		})
		return
	}

	const isFuelBusy = await isKernalBusy("fuel")
	if (isFuelBusy && !allowConcurrentFuelTasks) {
		logger.info("[min-data] Fuel 内核正忙，跳过本轮")
		mw?.webContents.send("min-data-schedule-status", {
			type: "skipped",
			reason: "busy",
		})
		return
	}

	mw?.webContents.send("min-data-schedule-status", {
		type: "executing",
		task: "accurate",
	})
	try {
		const args =
			systemState.minDataMode === "stable"
				? ["min_data", "thread"]
				: ["min_data"]
		const action = `定时获取准确QMT数据-${systemState.minDataMode === "stable" ? "稳定" : "极速"}模式`
		await execBin(args, action)
		logger.info("[min-data] 准确数据获取完成")
	} catch (error) {
		logger.error(`[min-data] 准确数据获取失败: ${error}`)
	}

	mw?.webContents.send("min-data-schedule-status", { type: "done" })
}

const setupMinDataScheduler = () => {
	cancelMinDataScheduler()
	// 每日触发，具体是否执行由 period_offset.csv 交易日历判断
	systemState.minDataJob = schedule.scheduleJob("1/5 * * * *", wakeUpMinData)
	logger.info(`[min-data] 定时任务已启动，模式: ${systemState.minDataMode}`)
}

const setAutoMinData = (options: {
	isOn: boolean
	mode?: "fast" | "stable"
}) => {
	systemState.isSetAutoMinData = options.isOn
	if (options.mode !== undefined) systemState.minDataMode = options.mode

	logger.info(
		`[min-data] 自动更新: ${systemState.isSetAutoMinData}, 模式: ${systemState.minDataMode}`,
	)

	if (!options.isOn) {
		cancelMinDataScheduler()
		return
	}

	setupMinDataScheduler()
}

export {
	setAutoUpdate,
	setAutoTrading,
	setAutoMinData,
	setupScheduler,
	systemState,
}
