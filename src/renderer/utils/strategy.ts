/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { StrategyRuntimeConfig } from "@/renderer/store/storage"
import type {
	BasicStgType,
	PosStrategyType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { STOCK_QUANT_STRATEGY_CONFIG } from "@/shared/constants"
import { buildStockQuantPayload } from "@/shared/lib/basic-strategy-import"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import { autoTradeTimeByRebTime } from "./trade"

const { setStoreValue, setRebalanceTimeConfig } = window.electronAPI

// 写入每个策略的rebalance_time的rebTimeConfig，若rebTime不存在则先创建
const addStrategyToRebTimeConfig = (
	rebTimeConfig: Record<string, RebTimeConfig<SelectStgType | PosStrategyType>>,
	rebTime: string,
	strategy: BasicStgType | SelectStgType | PosStrategyType,
): void => {
	rebTimeConfig[rebTime] ??= {
		...autoTradeTimeByRebTime(rebTime),
		strategies: [],
	}
	rebTimeConfig[rebTime].strategies.push(strategy)
}

const buildStrategyRuntimeConfig = (
	names: string[],
	existing?: Record<string, StrategyRuntimeConfig>,
): Record<string, StrategyRuntimeConfig> => {
	const config: Record<string, StrategyRuntimeConfig> = {}
	for (const name of names) {
		const prev = existing?.[name]
		if (!prev) continue
		const { split_order_amount: _omit, ...rest } =
			prev as StrategyRuntimeConfig & {
				split_order_amount?: number
			}
		if (Object.keys(rest).length > 0) config[name] = rest
	}
	return config
}

const collectSelectRuntimeNames = (strategies: BasicStgType[]): string[] =>
	strategies
		.map((s) => (s as { name?: string }).name)
		.filter((name): name is string => Boolean(name))

const collectFusionRuntimeNames = (
	fusion: (SelectStgType | StgGroupType | PosStrategyType)[],
): string[] => {
	const names: string[] = []
	const add = (name?: string) => {
		if (name) names.push(name)
	}

	for (const item of fusion) {
		if (item.type === "pos") {
			const pos = item as PosStrategyType
			add(pos.name)
			for (const poolItem of pos.strategy_pool) {
				if (poolItem.type === "group") {
					for (const stg of (poolItem as StgGroupType).strategy_list) {
						add(stg.name)
					}
				} else {
					add((poolItem as SelectStgType).name)
				}
			}
		} else if (item.type === "group") {
			for (const stg of (item as StgGroupType).strategy_list) {
				add(stg.name)
			}
		} else {
			add((item as SelectStgType).name)
		}
	}

	return names
}

/**
 * 重新生成指定 rebalance_time 的换仓时间
 * @param rebTimeConfig 当前的换仓时间配置
 * @param rebTime 要重新生成的 rebalance_time
 * @returns 更新后的 rebTimeConfig
 */
export const regenerateRebTime = (
	rebTimeConfig: Record<string, RebTimeConfig<SelectStgType | PosStrategyType>>,
	rebTime: string,
): Record<string, RebTimeConfig<SelectStgType | PosStrategyType>> => {
	const { sell_time, buy_time } = autoTradeTimeByRebTime(rebTime)
	const strategies = rebTimeConfig[rebTime]?.strategies ?? []

	return {
		...rebTimeConfig,
		[rebTime]: {
			sell_time,
			buy_time,
			strategies, // 保留原有的策略列表
		},
	}
}

// -- 处理偏移列表，支持中英文逗号，去重和转换为数字
export const processOffsetList = (offsetListStr: string): number[] => {
	return Array.from(
		new Set(
			offsetListStr
				.replace(/，/g, ",")
				.split(",")
				.map((s) => s.trim().replace(/\s+/g, "")) // -- 处理空格
				.filter((s) => s !== "") // -- 过滤空字符串
				.map(Number), // -- 转换为数字
		),
	).sort((a, b) => a - b) // -- 排序
}

// -- 生成随机交易时间
// export const generateTradeTime = () => {
// 	return {
// 		buy_time: generateRandomTime(9, 24, 50),
// 		sell_time: generateRandomTime(14, 45, 50),
// 		split_order_amount: Math.floor(Math.random() * (12000 - 6000 + 1)) + 6000,
// 	}
// }

const genSelectStgInfo = (
	strategy: BasicStgType | SelectStgType,
	includeInfo = true,
) => {
	const { info, ...rest } = strategy

	return {
		...rest,
		...("select_num" in rest && rest.select_num != null
			? { select_num: Number.parseInt(String(rest.select_num)) }
			: {}),
		...(includeInfo ? { info: info ?? {} } : {}),
	}
}

export const saveStockQuantStrategies = async (
	strategies: BasicStgType[],
	existingRebTimeConfig?: Record<
		string,
		RebTimeConfig<SelectStgType | PosStrategyType>
	>,
	existingRuntimeConfig?: Record<string, StrategyRuntimeConfig>,
) => {
	const strategiesWithAdjustedWeight = strategies.map((strategy) => ({
		...strategy,
		...("calc_time" in strategy
			? { calc_time: strategy.calc_time ?? "08:00:00" }
			: {}),
	}))

	const rebTimeConfig: Record<
		string,
		RebTimeConfig<SelectStgType | PosStrategyType>
	> = {}

	if (existingRebTimeConfig) {
		for (const [rebTime, config] of Object.entries(existingRebTimeConfig)) {
			rebTimeConfig[rebTime] = {
				sell_time: config.sell_time,
				buy_time: config.buy_time,
				strategies: [],
			}
		}
	}

	for (const strategy of strategiesWithAdjustedWeight) {
		const rebTime = strategy.rebalance_time ?? "close-open"
		addStrategyToRebTimeConfig(rebTimeConfig, rebTime, strategy)
	}

	for (const rebTime of Object.keys(rebTimeConfig)) {
		if (rebTimeConfig[rebTime].strategies.length === 0) {
			delete rebTimeConfig[rebTime]
		}
	}

	const selectStrategyList = strategiesWithAdjustedWeight.map((stg) =>
		genSelectStgInfo(stg, false),
	)
	const strategyRuntimeConfig = buildStrategyRuntimeConfig(
		collectSelectRuntimeNames(strategiesWithAdjustedWeight),
		existingRuntimeConfig,
	)

	if (selectStrategyList.length === 0) {
		await setStoreValue(STOCK_QUANT_STRATEGY_CONFIG, {})
		await setRebalanceTimeConfig(rebTimeConfig)
		return { rebTimeConfig, strategyRuntimeConfig }
	}

	const payload = buildStockQuantPayload(selectStrategyList)
	if (payload) {
		await setStoreValue(STOCK_QUANT_STRATEGY_CONFIG, payload)
	}

	await setRebalanceTimeConfig(rebTimeConfig)
	return { rebTimeConfig, strategyRuntimeConfig }
}

// 仓位管理生成dict
export const saveStrategyListFusion = async (
	fusionStrategies: (SelectStgType | StgGroupType | PosStrategyType)[],
	existingRebTimeConfig?: Record<
		string,
		RebTimeConfig<SelectStgType | PosStrategyType>
	>,
	existingRuntimeConfig?: Record<string, StrategyRuntimeConfig>,
) => {
	/**
	 * @description 保存仓位管理策略列表
	 * @param fusionStrategies 策略列表
	 * @param existingRebTimeConfig 已有的换仓时间配置（可选），如果提供则复用已有的时间
	 * @returns { strategyDict, rebTimeConfig }
	 */
	// 深度拷贝输入的策略，避免污染原始数据
	const strategies = JSON.parse(JSON.stringify(fusionStrategies))
	const strategiesWithAdjustedWeight = strategies.map(
		(strategy: SelectStgType | StgGroupType | PosStrategyType) => ({
			...strategy,
		}),
	)

	// -- 生成zeus内核策略列表
	const selectStrategyList = strategiesWithAdjustedWeight.map(
		(stg: SelectStgType | StgGroupType | PosStrategyType) => {
			switch (stg.type) {
				case "pos":
					return {
						name: stg.name,
						remark_name: stg.remark_name ?? "",
						hold_period: stg.hold_period,
						offset_list: stg.offset_list,
						max_select_num: stg.max_select_num ?? 0, // -- 最大选股数量
						rebalance_time: stg.rebalance_time,
						cap_weight: stg.cap_weight,
						params: stg.params,
						strategy_pool: stg.strategy_pool.map((grp_or_stg) =>
							grp_or_stg.type === "group"
								? {
										name: grp_or_stg.name,
										remark_name: grp_or_stg.remark_name ?? "",
										cap_weight: grp_or_stg.cap_weight,
										strategy_list: grp_or_stg.strategy_list.map((_stg) =>
											genSelectStgInfo(_stg as SelectStgType),
										),
									}
								: genSelectStgInfo(grp_or_stg as SelectStgType),
						),
						re_timing: stg.re_timing, // 资金曲线再择时
					}
				case "group":
					return {
						name: stg.name,
						remark_name: stg.remark_name ?? "",
						cap_weight: stg.cap_weight,
						strategy_list: stg.strategy_list.map((_stg) =>
							genSelectStgInfo(_stg as SelectStgType),
						),
						re_timing: stg.re_timing, // 资金曲线再择时
					}
				default:
					return genSelectStgInfo(stg as SelectStgType)
			}
		},
	)
	await setStoreValue("pos_mgmt.strategies", selectStrategyList)

	const rebTimeConfig: Record<
		string,
		RebTimeConfig<SelectStgType | PosStrategyType>
	> = {}

	if (existingRebTimeConfig) {
		for (const [rebTime, config] of Object.entries(existingRebTimeConfig)) {
			rebTimeConfig[rebTime] = {
				sell_time: config.sell_time,
				buy_time: config.buy_time,
				strategies: [],
			}
		}
	}

	for (const strategy of strategiesWithAdjustedWeight) {
		if (strategy.type === "pos") {
			const rebTime = strategy.rebalance_time ?? "close-open"
			addStrategyToRebTimeConfig(
				rebTimeConfig,
				rebTime,
				strategy as PosStrategyType,
			)
		} else if (strategy.type === "group") {
			for (const subStrategy of strategy.strategy_list) {
				const rebTime = subStrategy.rebalance_time ?? "close-open"
				addStrategyToRebTimeConfig(rebTimeConfig, rebTime, subStrategy)
			}
		} else {
			const rebTime = strategy.rebalance_time ?? "close-open"
			addStrategyToRebTimeConfig(
				rebTimeConfig,
				rebTime,
				strategy as SelectStgType,
			)
		}
	}

	for (const rebTime of Object.keys(rebTimeConfig)) {
		if (rebTimeConfig[rebTime].strategies.length === 0) {
			delete rebTimeConfig[rebTime]
		}
	}

	const strategyRuntimeConfig = buildStrategyRuntimeConfig(
		collectFusionRuntimeNames(strategiesWithAdjustedWeight),
		existingRuntimeConfig,
	)

	await setRebalanceTimeConfig(rebTimeConfig)
	return { rebTimeConfig, strategyRuntimeConfig }
}

// 收集选股策略的 remark_name
export function collectSelectRemarkNames(
	list: Array<{ remark_name?: string }>,
	excludeIndex?: number,
): Set<string> {
	const names = new Set<string>()
	for (let i = 0; i < list.length; i++) {
		if (i === excludeIndex) continue
		const rn = list[i].remark_name?.trim()
		if (rn) names.add(rn)
	}
	return names
}

// 收集仓管模式下的remark_name
export function collectFusionRemarkNames(
	fusion: (SelectStgType | StgGroupType | PosStrategyType)[],
	excludeIdentity?: { fusionIndex: number; rowIndex?: number },
): Set<string> {
	const names = new Set<string>()

	for (let i = 0; i < fusion.length; i++) {
		const item = fusion[i] as any
		const isExcludedTop =
			excludeIdentity &&
			excludeIdentity.fusionIndex === i &&
			excludeIdentity.rowIndex === undefined

		if (!isExcludedTop) {
			const rn = item.remark_name?.trim()
			if (rn) names.add(rn)
		}

		if (item.strategy_pool) {
			for (let j = 0; j < item.strategy_pool.length; j++) {
				const poolItem = item.strategy_pool[j]
				const isExcludedChild =
					excludeIdentity &&
					excludeIdentity.fusionIndex === i &&
					excludeIdentity.rowIndex === j
				if (isExcludedChild) continue

				const rn = poolItem.remark_name?.trim()
				if (rn) names.add(rn)

				if (poolItem.strategy_list) {
					for (const sub of poolItem.strategy_list) {
						const subRn = sub.remark_name?.trim()
						if (subRn) names.add(subRn)
					}
				}
			}
		} else if (item.strategy_list) {
			for (let j = 0; j < item.strategy_list.length; j++) {
				const isExcludedChild =
					excludeIdentity &&
					excludeIdentity.fusionIndex === i &&
					excludeIdentity.rowIndex === j
				if (isExcludedChild) continue

				const sub = item.strategy_list[j]
				const rn = sub.remark_name?.trim()
				if (rn) names.add(rn)
			}
		}
	}

	return names
}
