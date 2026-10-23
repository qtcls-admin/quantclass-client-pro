/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { getRebalanceTimeConfig } from "@/main/lib/rebalanceTimeStore.js"
import configStore, { rStore } from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import { STOCK_QUANT_STRATEGY_CONFIG } from "@/shared/constants.js"
import { stockQuantToStrategyList } from "@/shared/lib/basic-strategy-import.js"
import { checkPermission } from "@/shared/lib/permission.js"
import {
	type SelectStrategyNameSource,
	getFusionGroupSubRealMarketStrategyName,
	getFusionTopRealMarketStrategyName,
	getSelectRealMarketStrategyName,
} from "@/shared/lib/real-market-strategy-name.js"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"

interface TimeParts {
	hour: number
	minute: number
	second?: number
}

interface StrategySource extends SelectStrategyNameSource {
	name?: string
	remark_name?: string
	cap_weight?: number
	hold_period?: string
	offset_list?: number[]
	select_num?: number
	max_select_num?: number
	rebalance_time?: string
	strategy_pool?: unknown[]
	strategy_list?: StrategySource[]
}

interface RealMarketEntry {
	strategy_weight: number
	hold_plan: string[]
	select_count: number
	stock_weight: ["equal_weight", false]
	buy: ["t_wap", string, number, number, number]
	sell: ["base_sell", string]
	risk: [false]
	intraday_swap: number
	netting_tag?: string
	name: string
}

interface StrategyDraft {
	name: string
	strategy_weight: number
	hold_plan: string[]
	select_count: number
	buyTime: string
	sellTime: string
	rebalanceTime: string
	intraday_swap: number
}

const NON_STRATEGY_NAME = "非策略选股"

function pad2(value: number): string {
	return String(value).padStart(2, "0")
}

function formatTradeTime(time: TimeParts | undefined): string {
	if (
		!time ||
		typeof time.hour !== "number" ||
		typeof time.minute !== "number"
	) {
		return ""
	}
	return `${pad2(time.hour)}:${pad2(time.minute)}:${pad2(time.second ?? 0)}`
}

function intradaySwap(rebalanceTime: string): number {
	if (rebalanceTime === "close-open") return 0
	if (rebalanceTime === "open") return 1
	if (rebalanceTime === "close") return 2
	return 1
}

function randomBuyInterval(): number {
	return Math.floor(Math.random() * (45 - 25 + 1)) + 25
}

function resolveSplitOrderAmount(raw: unknown): number {
	const num = typeof raw === "number" ? raw : Number(raw)
	if (typeof num === "number" && !Number.isNaN(num)) return num
	logger.warn("[real_market_25] split_order_amount 缺失，使用 1X 随机值")
	return Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000
}

function holdPlan(strategy: StrategySource): string[] {
	const offsets = strategy.offset_list?.length ? strategy.offset_list : [0]
	const period = (strategy.hold_period ?? "5D").replace("D", "")
	return offsets.map((offset) => `${period}_${offset}`)
}

function tradeTimes(
	rebalanceTime: string,
	rebConfig: Record<string, RebTimeConfig>,
): { buy: string; sell: string } {
	const entry = rebConfig[rebalanceTime]
	if (!entry) {
		logger.warn(`[real_market_25] 缺少换仓时间: ${rebalanceTime}`)
	}
	return {
		buy: formatTradeTime(entry?.buy_time),
		sell: formatTradeTime(entry?.sell_time),
	}
}

function toDraft(
	strategy: StrategySource,
	name: string,
	strategyWeight: number,
	selectCount: number,
	rebConfig: Record<string, RebTimeConfig>,
): StrategyDraft {
	const rebalanceTime = strategy.rebalance_time ?? "close-open"
	const times = tradeTimes(rebalanceTime, rebConfig)
	return {
		name,
		strategy_weight: strategyWeight,
		hold_plan: holdPlan(strategy),
		select_count: selectCount,
		buyTime: times.buy,
		sellTime: times.sell,
		rebalanceTime,
		intraday_swap: intradaySwap(rebalanceTime),
	}
}

function collectSelectDrafts(
	strategies: StrategySource[],
	rebConfig: Record<string, RebTimeConfig>,
): StrategyDraft[] {
	return strategies.map((strategy, index) =>
		toDraft(
			strategy,
			strategy.remark_name?.trim() ||
				getSelectRealMarketStrategyName(index, strategy),
			strategy.cap_weight ?? 0,
			Number(strategy.select_num ?? 0),
			rebConfig,
		),
	)
}

function collectFusionDrafts(
	strategies: StrategySource[],
	rebConfig: Record<string, RebTimeConfig>,
): StrategyDraft[] {
	const drafts: StrategyDraft[] = []
	strategies.forEach((strategy, index) => {
		const topName =
			strategy.remark_name?.trim() ||
			getFusionTopRealMarketStrategyName(index, strategy.name ?? "策略")

		if (Array.isArray(strategy.strategy_pool)) {
			drafts.push(
				toDraft(
					strategy,
					topName,
					strategy.cap_weight ?? 0,
					strategy.max_select_num ?? 3,
					rebConfig,
				),
			)
			return
		}

		if (Array.isArray(strategy.strategy_list)) {
			const subs = strategy.strategy_list
			for (let subIndex = 0; subIndex < subs.length; subIndex++) {
				const sub = subs[subIndex]
				drafts.push(
					toDraft(
						sub,
						sub.remark_name?.trim() ||
							getFusionGroupSubRealMarketStrategyName(
								index,
								strategy.name ?? "策略",
								subIndex,
								sub.name ?? "策略",
								subs.length,
							),
						(sub.cap_weight ?? 0) * (strategy.cap_weight ?? 0),
						Number(sub.select_num ?? 0),
						rebConfig,
					),
				)
			}
			return
		}

		drafts.push(
			toDraft(
				strategy,
				topName,
				strategy.cap_weight ?? 0,
				Number(strategy.select_num ?? 0),
				rebConfig,
			),
		)
	})
	return drafts
}

function toEntry(
	draft: StrategyDraft,
	interval: number,
	splitOrderAmount: number,
): RealMarketEntry {
	return {
		strategy_weight: draft.strategy_weight,
		hold_plan: draft.hold_plan,
		select_count: draft.select_count,
		stock_weight: ["equal_weight", false],
		buy: ["t_wap", draft.buyTime, interval, splitOrderAmount, 1.005],
		sell: ["base_sell", draft.sellTime],
		risk: [false],
		intraday_swap: draft.intraday_swap,
		netting_tag: draft.rebalanceTime,
		name: draft.name,
	}
}

function buildNonStrategy(
	splitOrderAmount: number,
	reused?: RealMarketEntry,
): RealMarketEntry {
	return {
		strategy_weight: 0,
		hold_plan: ["5_0", "5_1", "5_2", "5_3", "5_4"],
		select_count: 5,
		stock_weight: ["equal_weight", false],
		buy: [
			"t_wap",
			reused?.buy?.[1] ?? `09:24:${Math.floor(Math.random() * 50) + 10}`,
			reused?.buy?.[2] ?? randomBuyInterval(),
			splitOrderAmount,
			1.005,
		],
		sell: [
			"base_sell",
			reused?.sell?.[1] ??
				`14:${Math.floor(Math.random() * 11) + 45}:${Math.floor(Math.random() * 50) + 10}`,
		],
		risk: [false],
		intraday_swap: 0,
		name: NON_STRATEGY_NAME,
	}
}

function readPreviousEntries(): RealMarketEntry[] {
	const raw = { ...(rStore.store as Record<string, RealMarketEntry>) }
	return Object.keys(raw)
		.filter((key) => /^strategy_\d+$/.test(key))
		.sort(
			(left, right) =>
				Number(left.slice("strategy_".length)) -
				Number(right.slice("strategy_".length)),
		)
		.map((key) => raw[key])
		.filter((entry) => entry && typeof entry === "object")
}

function isSameContent(
	previous: RealMarketEntry[],
	drafts: StrategyDraft[],
	splitOrderAmount: number,
): boolean {
	const previousStrategies = previous.filter(
		(entry) => entry.name !== NON_STRATEGY_NAME,
	)
	if (previousStrategies.length !== drafts.length) return false
	return drafts.every((draft, index) => {
		const entry = previousStrategies[index]
		return (
			entry?.name === draft.name &&
			entry.buy?.[1] === draft.buyTime &&
			entry.sell?.[1] === draft.sellTime &&
			entry.buy?.[3] === splitOrderAmount
		)
	})
}

export async function writeRealMarket25(
	permissions: string[] | undefined,
): Promise<void> {
	const isMember = checkPermission(permissions, "isMember")
	const rebConfig = getRebalanceTimeConfig()
	const splitOrderAmount = resolveSplitOrderAmount(
		await configStore.getValue("real_market_config.split_order_amount"),
	)
	const strategies = isMember
		? ((await configStore.getValue(
				"pos_mgmt.strategies",
				[],
			)) as StrategySource[])
		: (stockQuantToStrategyList(
				await configStore.getValue(STOCK_QUANT_STRATEGY_CONFIG, {}),
			) as StrategySource[])
	const drafts = isMember
		? collectFusionDrafts(strategies, rebConfig)
		: collectSelectDrafts(strategies, rebConfig)

	const previous = readPreviousEntries()
	const unchanged = isSameContent(previous, drafts, splitOrderAmount)
	const previousStrategies = previous.filter(
		(entry) => entry.name !== NON_STRATEGY_NAME,
	)
	const entries = drafts.map((draft, index) =>
		toEntry(
			draft,
			unchanged
				? (previousStrategies[index]?.buy?.[2] ?? randomBuyInterval())
				: randomBuyInterval(),
			splitOrderAmount,
		),
	)
	const previousNonStrategy = previous.find(
		(entry) => entry.name === NON_STRATEGY_NAME,
	)
	entries.push(
		buildNonStrategy(
			splitOrderAmount,
			unchanged ? previousNonStrategy : undefined,
		),
	)

	const payload: Record<string, RealMarketEntry> = {}
	entries.forEach((entry, index) => {
		payload[`strategy_${index}`] = entry
	})
	rStore.clear()
	rStore.set(payload)
	logger.info(`[real_market_25] 已写入 ${entries.length} 条策略配置`)
}
