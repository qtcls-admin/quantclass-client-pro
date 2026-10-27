/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	reTimingAtom,
	rebTimeConfigAtom,
	selectStgListAtom,
	strategyRuntimeConfigAtom,
} from "@/renderer/store/storage"
import type { BasicStgType } from "@/renderer/types/strategy"
import { saveStockQuantStrategies } from "@/renderer/utils/strategy"
import { useAtom, useSetAtom } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"

const { setStoreValue } = window.electronAPI

export function useStrategyManager() {
	const [selectStgList, setSelectStgList] = useAtom(selectStgListAtom)
	const [rebTimeConfig, setRebTimeConfig] = useAtom(rebTimeConfigAtom)
	const [runtimeConfig, setRuntimeConfig] = useAtom(strategyRuntimeConfigAtom)
	const setReTiming = useSetAtom(reTimingAtom)

	const persistSelectStgList = useCallback(
		async (strategies: BasicStgType[]) => {
			const {
				rebTimeConfig: newRebTimeConfig,
				strategyRuntimeConfig: newRuntimeConfig,
			} = await saveStockQuantStrategies(
				strategies,
				rebTimeConfig,
				runtimeConfig,
			)
			setRebTimeConfig(newRebTimeConfig)
			setRuntimeConfig(newRuntimeConfig)
		},
		[rebTimeConfig, runtimeConfig, setRebTimeConfig, setRuntimeConfig],
	)

	const resetSelectStgList = useCallback(async () => {
		setSelectStgList([])
		setReTiming(null)
		setStoreValue("stock_quant.re_timing", null)
		await persistSelectStgList([])
		return []
	}, [setSelectStgList, setReTiming, persistSelectStgList])

	const syncSelectStgList = useAtomCallback(async (get, set) => {
		const currentSelectStgList = get(selectStgListAtom)
		const currentRebTimeConfig = get(rebTimeConfigAtom)
		const currentRuntimeConfig = get(strategyRuntimeConfigAtom)
		const {
			rebTimeConfig: newRebTimeConfig,
			strategyRuntimeConfig: newRuntimeConfig,
		} = await saveStockQuantStrategies(
			currentSelectStgList,
			currentRebTimeConfig,
			currentRuntimeConfig,
		)
		set(rebTimeConfigAtom, newRebTimeConfig)
		set(strategyRuntimeConfigAtom, newRuntimeConfig)
	})

	const updateSelectStgList = useCallback(
		async (strategies: BasicStgType[]) => {
			setSelectStgList(strategies)
			await persistSelectStgList(strategies)
			return strategies
		},
		[setSelectStgList, persistSelectStgList],
	)

	const addSelectStgList = useCallback(
		async (strategies: BasicStgType[]) => {
			const newList = [...selectStgList, ...strategies]
			setSelectStgList(newList)
			await persistSelectStgList(newList)
			return strategies
		},
		[selectStgList, setSelectStgList, persistSelectStgList],
	)

	const removeSelectStg = useCallback(
		async (strategyIndex: number) => {
			const newList = [
				...selectStgList.slice(0, strategyIndex),
				...selectStgList.slice(strategyIndex + 1),
			]
			setSelectStgList(newList)
			await persistSelectStgList(newList)
			return 1
		},
		[selectStgList, setSelectStgList, persistSelectStgList],
	)

	const updateSelectStg = useCallback(
		async (strategyIndex: number, strategy: BasicStgType) => {
			const newList = [
				...selectStgList.slice(0, strategyIndex),
				strategy,
				...selectStgList.slice(strategyIndex + 1),
			]
			setSelectStgList(newList)
			await persistSelectStgList(newList)
			return 1
		},
		[selectStgList, setSelectStgList, persistSelectStgList],
	)

	return {
		selectStgList,
		syncSelectStgList,
		updateSelectStgList,
		addSelectStgList,
		removeSelectStg,
		updateSelectStg,
		resetSelectStgList,
	}
}
