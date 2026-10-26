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
import type { SettingsType } from "@/renderer/types"
import type {
	PosStrategyType,
	ReTimingType,
	SelectStgType,
	StgGroupType,
} from "@/renderer/types/strategy"
import { saveStrategyListFusion } from "@/renderer/utils/strategy"
import { getSelectRealMarketStrategyName } from "@/shared/lib/real-market-strategy-name"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"

export type FusionStrategy = SelectStgType | StgGroupType | PosStrategyType

export interface StrategyPreviewItem {
	title: string
	detail?: string
}

export interface SelectStockMigrationSnapshot {
	backtestName: string
	initialCash: number
	startDate: string
	endDate: string
	reTiming: ReTimingType
	selectList: unknown[]
	posList: unknown[]
	fusionList: unknown[]
	selectPreview: StrategyPreviewItem[]
	posPreview: StrategyPreviewItem[]
	needsChoice: boolean
}

export type SelectStockMigrationDecision = "select" | "pos"

interface ApplySelectStockMigrationOptions {
	decision: SelectStockMigrationDecision
	snapshot: SelectStockMigrationSnapshot
	rebTimeConfig: Record<string, RebTimeConfig<SelectStgType | PosStrategyType>>
	runtimeConfig: Record<string, StrategyRuntimeConfig>
	setFusion: (strategies: FusionStrategy[]) => void
	setRebTimeConfig: (
		config: Record<string, RebTimeConfig<SelectStgType | PosStrategyType>>,
	) => void
	setRuntimeConfig: (config: Record<string, StrategyRuntimeConfig>) => void
	setBacktestConfig: (
		updater: (prev: {
			initial_cash: number
			start_date: Date
			end_date: Date | undefined
			backtest_name: string
		}) => {
			initial_cash: number
			start_date: Date
			end_date: Date | undefined
			backtest_name: string
		},
	) => void
	setReTiming: (value: ReTimingType) => void
	setSettings: (value: SettingsType) => void
}

function readString(value: unknown): string {
	return typeof value === "string" ? value.trim() : ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null
	return value as Record<string, unknown>
}

function readLocalStorageArray(key: string): unknown[] {
	try {
		const raw = localStorage.getItem(key)
		if (!raw) return []
		const parsed = JSON.parse(raw) as unknown
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

function readReTiming(value: unknown): ReTimingType {
	const record = asRecord(value)
	if (!record || typeof record.name !== "string" || !record.name.trim()) {
		return null
	}
	return {
		name: record.name,
		params: Array.isArray(record.params) ? record.params : [],
	}
}

export function fillSelectRemarkNames(list: unknown[]): SelectStgType[] {
	return list.map((item, index) => {
		const record = { ...(asRecord(item) ?? {}) } as SelectStgType
		const remark = readString(record.remark_name)
		return {
			...record,
			remark_name: remark || getSelectRealMarketStrategyName(index, record),
		}
	})
}

export function buildSelectGroup(
	backtestName: string,
	list: unknown[],
	reTiming: ReTimingType,
): StgGroupType {
	return {
		name: readString(backtestName) || "默认策略",
		type: "group",
		cap_weight: 1,
		isFold: false,
		remark_name: "",
		re_timing: reTiming,
		strategy_list: fillSelectRemarkNames(list),
	}
}

export function previewSelectStrategies(
	list: unknown[],
): StrategyPreviewItem[] {
	return fillSelectRemarkNames(list).map((strategy) => ({
		title:
			readString(strategy.remark_name) ||
			readString(strategy.name) ||
			"未命名策略",
	}))
}

function describePosItem(record: Record<string, unknown>): string {
	if (Array.isArray(record.strategy_pool)) {
		return `仓位管理 · ${record.strategy_pool.length} 条`
	}
	if (Array.isArray(record.strategy_list)) {
		return `策略组 · ${record.strategy_list.length} 条`
	}
	return "选股策略"
}

export function previewPosStrategies(list: unknown[]): StrategyPreviewItem[] {
	return list.map((item) => {
		const record = asRecord(item) ?? {}
		return {
			title:
				readString(record.remark_name) ||
				readString(record.name) ||
				"未命名策略",
			detail: describePosItem(record),
		}
	})
}

function hydratePoolChild(child: unknown): SelectStgType | StgGroupType {
	const record = { ...(asRecord(child) ?? {}) }
	if (Array.isArray(record.strategy_list)) {
		return {
			...record,
			type: "group",
			isFold: false,
			remark_name: readString(record.remark_name),
		} as StgGroupType
	}
	return {
		...record,
		remark_name: readString(record.remark_name),
	} as SelectStgType
}

/** 内核 pos_mgmt.strategies 没有 type，回填成 fusion 页面能识别的结构 */
export function hydrateFusionFromPosMgmt(
	strategies: unknown[],
): FusionStrategy[] {
	return strategies.map((item) => {
		const record = { ...(asRecord(item) ?? {}) }
		if (Array.isArray(record.strategy_pool)) {
			return {
				...record,
				type: "pos",
				isFold: false,
				remark_name: readString(record.remark_name),
				cap_weight:
					typeof record.cap_weight === "number" ? record.cap_weight : 0,
				strategy_pool: record.strategy_pool.map((child) =>
					hydratePoolChild(child),
				),
			} as PosStrategyType
		}
		if (Array.isArray(record.strategy_list)) {
			return {
				...record,
				type: "group",
				isFold: false,
				remark_name: readString(record.remark_name),
				cap_weight:
					typeof record.cap_weight === "number" ? record.cap_weight : 0,
			} as StgGroupType
		}
		return {
			...record,
			remark_name: readString(record.remark_name),
		} as SelectStgType
	})
}

export async function loadSelectStockMigrationSnapshot(): Promise<SelectStockMigrationSnapshot | null> {
	const { getStoreValue } = window.electronAPI
	const libraryType = await getStoreValue("settings.libraryType", "")
	if (libraryType !== "select") return null

	const [
		strategyList,
		backtestName,
		initialCash,
		startDate,
		endDate,
		reTiming,
		posStrategies,
	] = await Promise.all([
		getStoreValue("select_stock.strategy_list", []),
		getStoreValue("select_stock.backtest_name", "默认策略"),
		getStoreValue("select_stock.initial_cash", 100000),
		getStoreValue("select_stock.start_date", ""),
		getStoreValue("select_stock.end_date", ""),
		getStoreValue("select_stock.re_timing", null),
		getStoreValue("pos_mgmt.strategies", []),
	])

	const selectList = Array.isArray(strategyList) ? strategyList : []
	const posList = Array.isArray(posStrategies) ? posStrategies : []
	const name = readString(backtestName) || "默认策略"

	return {
		backtestName: name,
		initialCash: Number(initialCash) || 100000,
		startDate: typeof startDate === "string" ? startDate : "",
		endDate: typeof endDate === "string" ? endDate : "",
		reTiming: readReTiming(reTiming),
		selectList,
		posList,
		fusionList: readLocalStorageArray("fusion"),
		selectPreview: previewSelectStrategies(selectList),
		posPreview: previewPosStrategies(posList),
		needsChoice: posList.length > 0,
	}
}

async function clearLibraryType(setSettings: (value: SettingsType) => void) {
	const { getStoreValue, deleteStoreValue } = window.electronAPI
	await deleteStoreValue("settings.libraryType")
	const latest = await getStoreValue("settings", {})
	if (!latest || typeof latest !== "object") return
	const { libraryType: _libraryType, ...rest } = latest as SettingsType & {
		libraryType?: string
	}
	setSettings(rest)
}

export async function applySelectStockMigration({
	decision,
	snapshot,
	rebTimeConfig,
	runtimeConfig,
	setFusion,
	setRebTimeConfig,
	setRuntimeConfig,
	setBacktestConfig,
	setReTiming,
	setSettings,
}: ApplySelectStockMigrationOptions) {
	const { setStoreValue, rendererLog } = window.electronAPI

	if (decision === "select") {
		const group = buildSelectGroup(
			snapshot.backtestName,
			snapshot.selectList,
			snapshot.reTiming,
		)
		setFusion([group])
		const saved = await saveStrategyListFusion(
			[group],
			rebTimeConfig,
			runtimeConfig,
		)
		setRebTimeConfig(saved.rebTimeConfig)
		setRuntimeConfig(saved.strategyRuntimeConfig)
		await Promise.all([
			setStoreValue("pos_mgmt.backtest_name", group.name),
			setStoreValue("pos_mgmt.initial_cash", snapshot.initialCash),
			setStoreValue("pos_mgmt.start_date", snapshot.startDate),
			setStoreValue("pos_mgmt.end_date", snapshot.endDate),
			setStoreValue("pos_mgmt.re_timing", snapshot.reTiming),
		])
		setBacktestConfig((prev) => ({
			...prev,
			initial_cash: snapshot.initialCash,
			start_date: snapshot.startDate
				? new Date(snapshot.startDate)
				: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
			end_date: snapshot.endDate ? new Date(snapshot.endDate) : undefined,
			backtest_name: group.name,
		}))
		setReTiming(snapshot.reTiming)
		rendererLog(
			"info",
			`[select-stock-migration] 已用选股策略覆盖仓管策略库：${group.name}，${group.strategy_list.length} 条`,
		)
	} else if (snapshot.fusionList.length === 0 && snapshot.posList.length > 0) {
		const hydrated = hydrateFusionFromPosMgmt(snapshot.posList)
		setFusion(hydrated)
		const saved = await saveStrategyListFusion(
			hydrated,
			rebTimeConfig,
			runtimeConfig,
		)
		setRebTimeConfig(saved.rebTimeConfig)
		setRuntimeConfig(saved.strategyRuntimeConfig)
		rendererLog(
			"info",
			`[select-stock-migration] 保留仓管策略，并从 pos_mgmt.strategies 回填 ${hydrated.length} 条`,
		)
	} else {
		rendererLog("info", "[select-stock-migration] 保留现有仓管策略库")
	}

	await clearLibraryType(setSettings)
}
