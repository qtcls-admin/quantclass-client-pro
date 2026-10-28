/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getJsonDataFromFile } from "@/main/core/dataList.js"
import { getRebalanceTimeConfig } from "@/main/lib/rebalanceTimeStore.js"
import { userStore } from "@/main/lib/userStore.js"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { ROCKET_STATS_PATH, SELECT_STATS_PATH } from "@/main/vars.js"
import { STOCK_QUANT_STRATEGY_CONFIG } from "@/shared/constants.js"
import { stockQuantToStrategyList } from "@/shared/lib/basic-strategy-import.js"
import { checkPermission, getSelectKernal } from "@/shared/lib/permission.js"
import {
	getFusionGroupSubRealMarketStrategyName,
	getFusionTopRealMarketStrategyName,
	getSelectRealMarketStrategyName,
} from "@/shared/lib/real-market-strategy-name.js"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import type {
	StrategyStatus,
	StrategyStatusStat,
} from "@/shared/types/strategy-status.js"
import { StrategyStatusEnum } from "@/shared/types/strategy-status.js"
import { sortBy } from "lodash-es"

function pad2(value: number): string {
	return String(value).padStart(2, "0")
}

function formatRebTradeTime(
	time: RebTimeConfig["sell_time"] | undefined,
): string {
	if (
		!time ||
		typeof time.hour !== "number" ||
		typeof time.minute !== "number"
	) {
		return ""
	}
	return `${pad2(time.hour)}:${pad2(time.minute)}:${pad2(time.second ?? 0)}`
}

/** 按策略 rebalance_time 从 rebalance_time.json 解析买卖时间 */
function getTradeTimeStrings(
	rebalanceTime: string | undefined,
	rebConfig: Record<string, RebTimeConfig>,
): { sellTimeStr: string; buyTimeStr: string } {
	const key = rebalanceTime ?? "close-open"
	const entry = rebConfig[key]
	if (!entry) {
		logger.warn(`[strategy-status] 缺少换仓时间配置: ${key}`)
		return { sellTimeStr: "", buyTimeStr: "" }
	}
	return {
		sellTimeStr: formatRebTradeTime(entry.sell_time),
		buyTimeStr: formatRebTradeTime(entry.buy_time),
	}
}

// 从 JSON 文件读取 stats 数据
// kernel: 'fuel' | 'fusion' | 'rocket'
async function readStatsFromJson(
	date: string,
	kernel: string,
	strategyName?: string,
): Promise<StrategyStatusStat[]> {
	try {
		const fileName = `${kernel}-stats-${date}.json`
		const filePath =
			kernel === "rocket"
				? [...ROCKET_STATS_PATH, fileName]
				: [...SELECT_STATS_PATH, fileName]

		const data = await getJsonDataFromFile<{ stats?: any[] }>(
			filePath,
			`读取stats文件失败: ${filePath.join("/")}`,
			{},
		)

		if (!data.stats || !Array.isArray(data.stats)) {
			return []
		}

		// 按策略名筛选出 stats
		// SELECT_CLOSE 和 REVERSE_REPO 这两个tag始终包含，其他tag按策略名筛选
		let filteredStats = data.stats
		if (strategyName) {
			filteredStats = data.stats.filter(
				(stat: any) =>
					stat.tag === "SELECT_CLOSE" ||
					stat.tag === "REVERSE_REPO" ||
					stat.strategy === strategyName,
			)
		}

		const stats: StrategyStatusStat[] = filteredStats.map((stat: any) => {
			let time: [Date, Date | null] | null = null
			if (stat.time) {
				if (Array.isArray(stat.time)) {
					if (stat.time[0]) {
						// 时间范围 [startTime, endTime]
						// 如果 stat.time[0] 为 null（[null, null]），time 返回 null
						const startTime = new Date(stat.time[0])
						const endTime = stat.time[1] ? new Date(stat.time[1]) : null
						time = [startTime, endTime]
					}
				} else {
					// 如果是单个时间，转换为时间范围 [time, null]（兼容json文件里返回单个时间格式）
					const startTime = new Date(stat.time)
					time = [startTime, null]
				}
			}

			return {
				tag: stat.tag || "",
				time,
				timeDes: stat.timeDes || "",
				messages: Array.isArray(stat.messages) ? stat.messages : [],
				...(stat.batchId && { batchId: stat.batchId }),
			}
		})

		return stats
	} catch (error) {
		return []
	}
}

/**
 * 计算前一天的日期
 * @param date 日期字符串，格式为 YYYY-MM-DD
 * @returns 前一天的日期字符串，格式为 YYYY-MM-DD
 */
function getPreviousDay(date: string): string {
	const base = new Date(date)
	const previous = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate() - 1,
	)
	const year = previous.getFullYear()
	const month = String(previous.getMonth() + 1).padStart(2, "0")
	const day = String(previous.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

// 获取策略的 timing 和 override 最晚时间
function getStrategyTiming(strategy: any): {
	latestTime: string
	hasTimingOrOverride: boolean
} {
	const times: string[] = []
	let hasTiming = false
	let hasOverride = false

	if (strategy.timing?.factor_list) {
		hasTiming = true
		for (const factor of strategy.timing.factor_list) {
			if (Array.isArray(factor) && factor.length > 0) {
				const lastElement = factor[factor.length - 1]
				if (typeof lastElement === "string" && /^\d{4}$/.test(lastElement)) {
					times.push(lastElement)
				}
			}
		}
	}

	if (strategy.override?.factor_list) {
		hasOverride = true
		for (const factor of strategy.override.factor_list) {
			if (Array.isArray(factor) && factor.length > 0) {
				const lastElement = factor[factor.length - 1]
				if (typeof lastElement === "string" && /^\d{4}$/.test(lastElement)) {
					times.push(lastElement)
				}
			}
		}
	}

	const hasTimingOrOverride = hasTiming || hasOverride
	const latestTime = times.length > 0 ? times.sort().pop() || "" : ""

	return { latestTime, hasTimingOrOverride }
}

// 检查策略是否配置了 stock_timing_list
function hasStockTimingListConfig(strategy: any): boolean {
	const list = strategy?.stock_timing_list
	return Array.isArray(list) && list.length > 0
}

/**
 * 将时间字符串转换为Date对象
 * @param timeStr 时间字符串，如 "0945" (HHMM) 或 "094530" (HHMMSS)
 * @param date 日期字符串，格式为 YYYY-MM-DD
 * @param dayOffset 天数偏移，0为当天，-1为前一天，1为后一天
 */
function parseTimeToDate(
	timeStr: string,
	date: string,
	dayOffset = 0,
): Date | null {
	if (!timeStr) {
		return null
	}

	let hour: number
	let minute: number
	let second = 0

	if (/^\d{4}$/.test(timeStr)) {
		// HHMM格式
		hour = Number.parseInt(timeStr.substring(0, 2), 10)
		minute = Number.parseInt(timeStr.substring(2, 4), 10)
	} else if (/^\d{6}$/.test(timeStr)) {
		// HHMMSS格式
		hour = Number.parseInt(timeStr.substring(0, 2), 10)
		minute = Number.parseInt(timeStr.substring(2, 4), 10)
		second = Number.parseInt(timeStr.substring(4, 6), 10)
	} else {
		return null
	}

	const base = new Date(date)
	const result = new Date(
		base.getFullYear(),
		base.getMonth(),
		base.getDate() + dayOffset,
		hour,
		minute,
		second,
	)

	return result
}

// 根据计划时间和实际执行时间判断状态
// planTime: 计划时间（单个时间点）
// stat.time: 实际执行时间范围 [startTime, endTime | null]
// deadlineTime: 截止时间（下一个状态的计划开始时间）
// strictMatch: 只有实盘卖出和买入需要严格匹配时间
function determineStatus(
	planTime: Date | null,
	deadlineTime: Date | null,
	stat?: StrategyStatusStat,
	strictMatch = false,
): StrategyStatusEnum {
	// 如果没有计划时间，默认为pending
	if (!planTime) {
		return StrategyStatusEnum.PENDING
	}

	const now = new Date()

	// 如果还没有实际执行开始时间（还未开始）
	if (!stat?.time) {
		// 如果是实盘卖出和买入，检查是否超过计划时间20分钟
		if (strictMatch) {
			const twentyMinutesInMs = 20 * 60 * 1000
			if (now.getTime() > planTime.getTime() + twentyMinutesInMs) {
				return StrategyStatusEnum.INCOMPLETE
			}
			return StrategyStatusEnum.PENDING
		}

		// 检查当前时间是否超过截止时间（除实盘卖出和买入外的其他状态）
		if (deadlineTime && now > deadlineTime) {
			return StrategyStatusEnum.INCOMPLETE
		}
		return StrategyStatusEnum.PENDING
	}

	const [statStartTime, statEndTime] = stat.time

	// 如果是实盘卖出和买入
	if (strictMatch) {
		// 如果有结束时间，返回已完成
		if (statEndTime) {
			return StrategyStatusEnum.COMPLETED
		}

		// 如果还未结束，检查是否超时（超过计划时间20分钟）
		const twentyMinutesInMs = 20 * 60 * 1000
		if (now.getTime() > planTime.getTime() + twentyMinutesInMs) {
			return StrategyStatusEnum.INCOMPLETE
		}
		// 如果没有结束时间且未超时，返回进行中
		return StrategyStatusEnum.IN_PROGRESS
	}

	// 检查开始时间是否超过截止时间（除实盘卖出和买入外的其他状态）
	if (deadlineTime && statStartTime > deadlineTime) {
		return StrategyStatusEnum.INCOMPLETE
	}

	// 如果 stat 正在进行中（没有结束时间）
	if (!statEndTime) {
		return StrategyStatusEnum.IN_PROGRESS
	}

	// 检查结束时间是否超过截止时间（除实盘卖出和买入外的其他状态）
	if (deadlineTime && statEndTime > deadlineTime) {
		return StrategyStatusEnum.INCOMPLETE
	}

	return StrategyStatusEnum.COMPLETED
}

// 生成单个策略的状态列表
async function generateSingleStrategyStatus(
	strategyName: string,
	latestTiming: string,
	hasTimingOrOverride: boolean,
	sellTimeStr: string,
	buyTimeStr: string,
	date: string,
	isOvernightRebalance: boolean, // 是否隔日换仓
	isStrategyPool = false, // 是否为 pos 类型策略
	capWeight = 1, // 策略权重，0 表示非实盘
	hasStockTimingList = false,
): Promise<StrategyStatus[]> {
	const realMarketConfig = (await store.getValue("real_market_config", {})) as {
		use_open_sell?: string
	}
	const useOpenSell = realMarketConfig?.use_open_sell === "1"

	const userAccount = await userStore.getUserAccount()
	const selectKernal = getSelectKernal(userAccount?.permissions ?? [])
	const selectStats = await readStatsFromJson(date, selectKernal, strategyName)

	// 读取当天的 rocket stats
	const rocketStatsToday = await readStatsFromJson(date, "rocket", strategyName)

	// 如果是隔日换仓，从前一天读取 TRADE_SELL_PLAN 和 TRADE_SELL，从当天读取除这两个之外的其他状态
	const isSellTag = (tag: string) =>
		tag === "TRADE_SELL_PLAN" || tag === "TRADE_SELL"
	const rocketStats: StrategyStatusStat[] = isOvernightRebalance
		? [
				...(
					await readStatsFromJson(getPreviousDay(date), "rocket", strategyName)
				).filter((stat) => isSellTag(stat.tag)),
				...rocketStatsToday.filter((stat) => !isSellTag(stat.tag)),
			]
		: rocketStatsToday // 当日换仓，直接使用当天的所有 stats

	const sellDayOffset = isOvernightRebalance ? -1 : 0

	// 从卖出时间推算交易计划生成时间（卖出前2分钟）
	const sellTime = parseTimeToDate(
		sellTimeStr.replace(/:/g, ""),
		date,
		sellDayOffset,
	)
	// 生成卖出计划时间（卖出时间前2分钟）
	const sellPlanTime = sellTime
		? new Date(sellTime.getTime() - 2 * 60 * 1000)
		: null

	// 当天的买入时间
	const buyTime = parseTimeToDate(buyTimeStr.replace(/:/g, ""), date)
	// 生成买入计划时间（买入时间前2分钟）
	const buyPlanTime = buyTime
		? new Date(buyTime.getTime() - 2 * 60 * 1000)
		: null
	// 卖出计划截止时间（卖出计划时间加2分钟）
	const sellPlanDeadline = sellPlanTime
		? new Date(sellPlanTime.getTime() + 2 * 60 * 1000)
		: null
	// 买入计划截止时间（买入计划时间加2分钟）
	const buyPlanDeadline = buyPlanTime
		? new Date(buyPlanTime.getTime() + 2 * 60 * 1000)
		: null

	const qmtDataTime = isStrategyPool
		? sellPlanTime
		: parseTimeToDate(latestTiming, date)
			? new Date(parseTimeToDate(latestTiming, date)!.getTime() + 80 * 1000)
			: null

	// DATA_UPDATE: 前一天16:00，截止时间为前一天22:00
	// const dataUpdateTime = parseTimeToDate("1600", date, -1)
	// const dataUpdateDeadline = parseTimeToDate("2200", date, -1)

	// PRE_SELL: 当天9:15，截止时间为当天9:30
	const preSellTime = parseTimeToDate("0915", date)
	const preSellDeadline = parseTimeToDate("0930", date)

	// SELECT_CLOSE: 前一天15:00，截止时间为第二天9:30
	const selectCloseTime = parseTimeToDate("1500", date, -1)
	const selectCloseDeadline = parseTimeToDate("0930", date)

	// TRADE_REVERSE_REPO: 当天15:05，截止时间为当天15:30
	const tradeReverseRepoTime = parseTimeToDate("1505", date)
	const tradeReverseRepoDeadline = parseTimeToDate("1530", date)

	const findStatsByTag = (stats: StrategyStatusStat[], tag: string) => {
		return stats.filter((stat) => stat.tag === tag)
	}

	const findLatestStatByTag = (stats: StrategyStatusStat[], tag: string) => {
		const matchingStats = findStatsByTag(stats, tag)
		return matchingStats.length > 0
			? matchingStats[matchingStats.length - 1]
			: undefined
	}

	const statusList: StrategyStatus[] = [
		// {
		// 	strategyName,
		// 	tag: "DATA_UPDATE",
		// 	title: "历史数据更新",
		// 	description: "更新历史行情数据",
		// 	status: determineStatus(
		// 		dataUpdateTime,
		// 		dataUpdateDeadline,
		// 		findLatestStatByTag("DATA_UPDATE"),
		// 	),
		// 	plan: {
		// 		time: dataUpdateTime,
		// 	},
		// 	stat: findLatestStatByTag("DATA_UPDATE"),
		// 	stats: findStatsByTag("DATA_UPDATE"),
		// },
		{
			strategyName,
			tag: "SELECT_CLOSE",
			title: "选股",
			description: "基于收盘数据生成选股结果",
			status: determineStatus(
				selectCloseTime,
				selectCloseDeadline,
				findLatestStatByTag(selectStats, "SELECT_CLOSE"),
			),
			plan: {
				time: selectCloseTime,
			},
			stat: findLatestStatByTag(selectStats, "SELECT_CLOSE"),
			stats: findStatsByTag(selectStats, "SELECT_CLOSE"),
		},
	]
	// 如果启用开盘挂涨停卖出，添加集合竞价卖出状态
	if (useOpenSell) {
		statusList.push({
			strategyName,
			tag: "TRADE_PRE_SELL" as const,
			title: "集合竞价卖出",
			description: "集合竞价卖出",
			status: determineStatus(
				preSellTime,
				preSellDeadline,
				findLatestStatByTag(rocketStats, "TRADE_PRE_SELL"),
			),
			plan: {
				time: preSellTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_PRE_SELL"),
			stats: findStatsByTag(rocketStats, "TRADE_PRE_SELL"),
		})
	}

	// stock_timing_list 不为空时显示个股择时
	if (hasStockTimingList) {
		statusList.push(
			{
				strategyName,
				tag: "STOCK_TIMING_SIG1_0930",
				title: "0930个股择时信号计算",
				description: "0930个股择时信号计算",
				status: determineStatus(
					parseTimeToDate("0930", date),
					parseTimeToDate("1030", date),
					findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_0930"),
				),
				plan: {
					time: parseTimeToDate("0930", date),
				},
				stat: findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_0930"),
				stats: findStatsByTag(selectStats, "STOCK_TIMING_SIG1_0930"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_TRADE_0930",
				title: "0930个股择时交易",
				description: "0930个股择时交易买入卖出",
				status: determineStatus(
					parseTimeToDate("0930", date),
					parseTimeToDate("1030", date),
					findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_0930"),
				),
				plan: {
					time: parseTimeToDate("0930", date),
				},
				stat: findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_0930"),
				stats: findStatsByTag(rocketStats, "STOCK_TIMING_TRADE_0930"),
			},
		)
	}

	// 只有当存在 timing 或 override 时，添加择时信号状态
	if (hasTimingOrOverride) {
		statusList.push(
			// {
			// 	strategyName,
			// 	tag: "SELECT_TIMING_SIG0",
			// 	title: "计算模糊择时信号",
			// 	description: "计算模糊择时信号",
			// 	status: determineStatus(
			// 		qmtDataTime,
			// 		sellPlanTime,
			// 		findLatestStatByTag(selectStats, "SELECT_TIMING_SIG0"),
			// 	),
			// 	plan: {
			// 		time: qmtDataTime,
			// 	},
			// 	stat: findLatestStatByTag(selectStats, "SELECT_TIMING_SIG0"),
			// 	stats: findStatsByTag(selectStats, "SELECT_TIMING_SIG0"),
			// 	isStrategyPool,
			// },
			{
				strategyName,
				tag: "SELECT_TIMING_SIG1",
				title: "计算精确择时信号",
				description: "计算精确择时信号",
				status: determineStatus(
					qmtDataTime,
					sellPlanTime,
					findLatestStatByTag(selectStats, "SELECT_TIMING_SIG1"),
				),
				plan: {
					time: qmtDataTime,
				},
				stat: findLatestStatByTag(selectStats, "SELECT_TIMING_SIG1"),
				stats: findStatsByTag(selectStats, "SELECT_TIMING_SIG1"),
				isStrategyPool,
			},
		)
	}

	statusList.push(
		{
			strategyName,
			tag: "TRADE_SELL_PLAN",
			title: "生成卖出计划",
			description: "在卖出时间前2分钟生成卖出计划",
			status: determineStatus(
				sellPlanTime,
				sellPlanDeadline,
				findLatestStatByTag(rocketStats, "TRADE_SELL_PLAN"),
			),
			plan: {
				time: sellPlanTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_SELL_PLAN"),
			stats: findStatsByTag(rocketStats, "TRADE_SELL_PLAN"),
		},
		{
			strategyName,
			tag: "TRADE_BUY_PLAN",
			title: "生成买入计划",
			description: "在买入时间前2分钟生成买入计划",
			status: determineStatus(
				buyPlanTime,
				buyPlanDeadline,
				findLatestStatByTag(rocketStats, "TRADE_BUY_PLAN"),
			),
			plan: {
				time: buyPlanTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_BUY_PLAN"),
			stats: findStatsByTag(rocketStats, "TRADE_BUY_PLAN"),
		},
		{
			strategyName,
			tag: "TRADE_SELL",
			title: "实盘卖出",
			description: "执行实盘卖出操作",
			status: determineStatus(
				sellTime,
				sellTime,
				findLatestStatByTag(rocketStats, "TRADE_SELL"),
				true, // 严格匹配时间
			),
			plan: {
				time: sellTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_SELL"),
			stats: findStatsByTag(rocketStats, "TRADE_SELL"),
		},
		{
			strategyName,
			tag: "TRADE_BUY",
			title: "实盘买入",
			description: "执行实盘买入操作",
			status: determineStatus(
				buyTime,
				buyTime,
				findLatestStatByTag(rocketStats, "TRADE_BUY"),
				true, // 严格匹配时间
			),
			plan: {
				time: buyTime,
			},
			stat: findLatestStatByTag(rocketStats, "TRADE_BUY"),
			stats: findStatsByTag(rocketStats, "TRADE_BUY"),
		},
	)

	// stock_timing_list 不为空时显示个股择时
	if (hasStockTimingList) {
		statusList.push(
			{
				strategyName,
				tag: "STOCK_TIMING_SIG1_1030",
				title: "1030个股择时信号计算",
				description: "1030个股择时信号计算",
				status: determineStatus(
					parseTimeToDate("1030", date),
					parseTimeToDate("1130", date),
					findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1030"),
				),
				plan: {
					time: parseTimeToDate("1030", date),
				},
				stat: findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1030"),
				stats: findStatsByTag(selectStats, "STOCK_TIMING_SIG1_1030"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_TRADE_1030",
				title: "1030个股择时交易",
				description: "1030个股择时交易买入卖出",
				status: determineStatus(
					parseTimeToDate("1030", date),
					parseTimeToDate("1130", date),
					findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1030"),
				),
				plan: {
					time: parseTimeToDate("1030", date),
				},
				stat: findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1030"),
				stats: findStatsByTag(rocketStats, "STOCK_TIMING_TRADE_1030"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_SIG1_1300",
				title: "1300个股择时信号计算",
				description: "1300个股择时信号计算",
				status: determineStatus(
					parseTimeToDate("1300", date),
					parseTimeToDate("1400", date),
					findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1300"),
				),
				plan: {
					time: parseTimeToDate("1300", date),
				},
				stat: findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1300"),
				stats: findStatsByTag(selectStats, "STOCK_TIMING_SIG1_1300"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_TRADE_1300",
				title: "1300个股择时交易",
				description: "1300个股择时交易买入卖出",
				status: determineStatus(
					parseTimeToDate("1300", date),
					parseTimeToDate("1400", date),
					findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1300"),
				),
				plan: {
					time: parseTimeToDate("1300", date),
				},
				stat: findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1300"),
				stats: findStatsByTag(rocketStats, "STOCK_TIMING_TRADE_1300"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_SIG1_1400",
				title: "1400个股择时信号计算",
				description: "1400个股择时信号计算",
				status: determineStatus(
					parseTimeToDate("1400", date),
					parseTimeToDate("1500", date),
					findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1400"),
				),
				plan: {
					time: parseTimeToDate("1400", date),
				},
				stat: findLatestStatByTag(selectStats, "STOCK_TIMING_SIG1_1400"),
				stats: findStatsByTag(selectStats, "STOCK_TIMING_SIG1_1400"),
			},
			{
				strategyName,
				tag: "STOCK_TIMING_TRADE_1400",
				title: "1400个股择时交易",
				description: "1400个股择时交易买入卖出",
				status: determineStatus(
					parseTimeToDate("1400", date),
					parseTimeToDate("1500", date),
					findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1400"),
				),
				plan: {
					time: parseTimeToDate("1400", date),
				},
				stat: findLatestStatByTag(rocketStats, "STOCK_TIMING_TRADE_1400"),
				stats: findStatsByTag(rocketStats, "STOCK_TIMING_TRADE_1400"),
			},
		)
	}

	statusList.push({
		strategyName,
		tag: "REVERSE_REPO",
		title: "收盘后",
		description: "下单逆回购",
		status: determineStatus(
			tradeReverseRepoTime,
			tradeReverseRepoDeadline,
			findLatestStatByTag(rocketStats, "REVERSE_REPO"),
		),
		plan: {
			time: tradeReverseRepoTime,
		},
		stat: findLatestStatByTag(rocketStats, "REVERSE_REPO"),
		stats: findStatsByTag(rocketStats, "REVERSE_REPO"),
	})

	const result = sortBy(statusList, (s) => {
		const t = s.plan.time
		// time 为 null，排在最后
		return t ? t.getTime() : Number.POSITIVE_INFINITY
	})
	return result.map((s) => ({ ...s, capWeight }))
}

/**
 * 生成策略状态列表（二维数组）
 * 会员走仓位管理，非会员走基础课程选股
 */
export async function getStrategyStatusList(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const userAccount = await userStore.getUserAccount()
		const isMember = checkPermission(userAccount?.permissions ?? [], "isMember")

		if (isMember) {
			return await getStrategyStatusListForPos(date)
		}

		return await getStrategyStatusListForSelect(date)
	} catch (error) {
		logger.error(`[strategy-status] 生成策略状态列表失败: ${error}`)
		return []
	}
}

// 选股模式状态列表函数
async function getStrategyStatusListForSelect(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const stockQuant = await store.getValue(STOCK_QUANT_STRATEGY_CONFIG, {})
		const strategyList = stockQuantToStrategyList(stockQuant) as any[]

		if (strategyList.length === 0) {
			logger.warn("[strategy-status] strategy_list 为空")
			return []
		}

		const rebConfig = getRebalanceTimeConfig()

		const result: StrategyStatus[][] = await Promise.all(
			strategyList.map(async (strategy: any, index: number) => {
				const strategyName =
					strategy.remark_name?.trim() ||
					getSelectRealMarketStrategyName(index, strategy)

				const rebalanceTime = strategy.rebalance_time
				const { sellTimeStr, buyTimeStr } = getTradeTimeStrings(
					rebalanceTime,
					rebConfig,
				)

				const { latestTime, hasTimingOrOverride } = getStrategyTiming(strategy)

				// rebalance_time 为 "close-open" 或不存在时，为隔日换仓，其他值则为当日换仓
				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				const capWeight = strategy.cap_weight ?? 1
				const hasStockTimingList = hasStockTimingListConfig(strategy)

				logger.info(
					`[strategy-status] 策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}, rebalance_time=${rebalanceTime}, isOvernightRebalance=${isOvernightRebalance}, cap_weight=${capWeight}, hasStockTimingList=${hasStockTimingList}`,
				)

				return await generateSingleStrategyStatus(
					strategyName,
					latestTime,
					hasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					date,
					isOvernightRebalance,
					false,
					capWeight,
					hasStockTimingList,
				)
			}),
		)

		logger.info(
			`[strategy-status] 生成了 ${strategyList.length} 个策略的状态列表`,
		)

		return result
	} catch (error) {
		logger.error(`[strategy-status] 生成select策略状态列表失败: ${error}`)
		return []
	}
}

// 仓管模式状态列表函数
async function getStrategyStatusListForPos(
	date: string,
): Promise<StrategyStatus[][]> {
	try {
		const posMgmtStrategies = (await store.getValue(
			"pos_mgmt.strategies",
			[],
		)) as any[]

		if (posMgmtStrategies.length === 0) {
			logger.warn("[strategy-status] pos_mgmt.strategies 为空")
			return []
		}

		const rebConfig = getRebalanceTimeConfig()

		interface PosStrategy {
			name: string
			latestTime: string
			hasTimingOrOverride: boolean
			sellTimeStr: string
			buyTimeStr: string
			rebalanceTime: string
			isOvernightRebalance: boolean
			isStrategyPool?: boolean
			capWeight: number
			hasStockTimingList: boolean
		}

		const posStrategies: PosStrategy[] = []

		for (let index = 0; index < posMgmtStrategies.length; index++) {
			const strategy = posMgmtStrategies[index]
			const strategyName =
				strategy.remark_name?.trim() ||
				getFusionTopRealMarketStrategyName(index, strategy.name)

			const type: "pos" | "group" | "select" =
				strategy.strategy_pool && Array.isArray(strategy.strategy_pool)
					? "pos"
					: strategy.strategy_list && Array.isArray(strategy.strategy_list)
						? "group"
						: "select"

			if (type === "pos") {
				// pos 类型：只生成一个元素
				const rebalanceTime = strategy.rebalance_time
				const { sellTimeStr, buyTimeStr } = getTradeTimeStrings(
					rebalanceTime,
					rebConfig,
				)

				// 检查 strategy_pool 中是否有任何子策略包含 timing 或 override
				let posHasTimingOrOverride = false
				let posHasStockTimingList = false
				const strategyPool = strategy.strategy_pool || []
				for (const poolItem of strategyPool) {
					// poolItem 可能是 group 或 select
					if (poolItem.strategy_list && Array.isArray(poolItem.strategy_list)) {
						// 是 group，检查其子策略
						for (const subStg of poolItem.strategy_list) {
							const { hasTimingOrOverride } = getStrategyTiming(subStg)
							if (hasTimingOrOverride) {
								posHasTimingOrOverride = true
							}
							if (hasStockTimingListConfig(subStg)) {
								posHasStockTimingList = true
							}
						}
					} else {
						// 是 select
						const { hasTimingOrOverride } = getStrategyTiming(poolItem)
						if (hasTimingOrOverride) {
							posHasTimingOrOverride = true
						}
						if (hasStockTimingListConfig(poolItem)) {
							posHasStockTimingList = true
						}
					}
				}

				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				const capWeight = strategy.cap_weight ?? 1
				posStrategies.push({
					name: strategyName,
					latestTime: "",
					hasTimingOrOverride: posHasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					rebalanceTime: rebalanceTime ?? "close-open",
					isOvernightRebalance,
					isStrategyPool: true, // 标记为 pos 类型
					capWeight,
					hasStockTimingList: posHasStockTimingList,
				})

				logger.info(
					`[strategy-status] pos策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, posHasTimingOrOverride=${posHasTimingOrOverride}, isStrategyPool=true, cap_weight=${capWeight}`,
				)
			} else if (type === "group") {
				// group 类型：展开 strategy_list
				const subStrategies = strategy.strategy_list

				for (let index0 = 0; index0 < subStrategies.length; index0++) {
					const subStrategy = subStrategies[index0]

					const dictKey =
						subStrategy.remark_name?.trim() ||
						getFusionGroupSubRealMarketStrategyName(
							index,
							strategy.name,
							index0,
							subStrategy.name,
							subStrategies.length,
						)

					const rebalanceTime = subStrategy.rebalance_time
					const { sellTimeStr, buyTimeStr } = getTradeTimeStrings(
						rebalanceTime,
						rebConfig,
					)

					const { latestTime, hasTimingOrOverride } =
						getStrategyTiming(subStrategy)

					const capWeight = subStrategy.cap_weight ?? 1
					const hasStockTimingList = hasStockTimingListConfig(subStrategy)

					posStrategies.push({
						name: dictKey,
						latestTime,
						hasTimingOrOverride,
						sellTimeStr,
						buyTimeStr,
						rebalanceTime: rebalanceTime ?? "close-open",
						isOvernightRebalance:
							!subStrategy.rebalance_time ||
							subStrategy.rebalance_time === "close-open",
						capWeight,
						hasStockTimingList,
					})

					logger.info(
						`[strategy-status] group子策略 ${index}.${index0}(${dictKey}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}`,
					)
				}
			} else {
				// select 类型：单个策略
				const rebalanceTime = strategy.rebalance_time
				const { sellTimeStr, buyTimeStr } = getTradeTimeStrings(
					rebalanceTime,
					rebConfig,
				)

				const { latestTime, hasTimingOrOverride } = getStrategyTiming(strategy)
				const isOvernightRebalance =
					!rebalanceTime || rebalanceTime === "close-open"

				const capWeight = strategy.cap_weight ?? 1
				const hasStockTimingList = hasStockTimingListConfig(strategy)

				posStrategies.push({
					name: strategyName,
					latestTime,
					hasTimingOrOverride,
					sellTimeStr,
					buyTimeStr,
					rebalanceTime: rebalanceTime ?? "close-open",
					isOvernightRebalance,
					capWeight,
					hasStockTimingList,
				})

				logger.info(
					`[strategy-status] select策略 ${index}(${strategyName}): 卖出时间=${sellTimeStr}, 买入时间=${buyTimeStr}, timing时间=${latestTime}, hasTimingOrOverride=${hasTimingOrOverride}, rebalance_time=${rebalanceTime}, cap_weight=${capWeight}`,
				)
			}
		}

		// 为每个策略生成状态
		const result: StrategyStatus[][] = await Promise.all(
			posStrategies.map(async (posStrategy) => {
				return await generateSingleStrategyStatus(
					posStrategy.name,
					posStrategy.latestTime,
					posStrategy.hasTimingOrOverride,
					posStrategy.sellTimeStr,
					posStrategy.buyTimeStr,
					date,
					posStrategy.isOvernightRebalance,
					posStrategy.isStrategyPool ?? false,
					posStrategy.capWeight,
					posStrategy.hasStockTimingList,
				)
			}),
		)

		logger.info(
			`[strategy-status] 生成了 ${posStrategies.length} 个仓位管理策略的状态列表`,
		)

		return result
	} catch (error) {
		logger.error(`[strategy-status] 生成pos策略状态列表失败: ${error}`)
		return []
	}
}
