/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type { SelectStgSchema } from "@/renderer/schemas/strategy"
import type {
	BasicRotationStgSchema,
	BasicSelectStgSchema,
	BasicTimingStgSchema,
} from "@/shared/schemas/basic-strategy.js"
import type { z } from "zod"

export type BasicSelectStgType = z.infer<typeof BasicSelectStgSchema>

export type BasicTimingStgType = z.infer<typeof BasicTimingStgSchema>

export type BasicRotationStgType = z.infer<typeof BasicRotationStgSchema>

export type BasicStgType =
	| BasicSelectStgType
	| BasicTimingStgType
	| BasicRotationStgType

export type SelectStgType = z.infer<typeof SelectStgSchema>

export type ReTimingType = {
	name: string
	params: any[]
} | null

// 以下是仓位策略管理的类型定义
export type StgGroupType = {
	name: string
	type: "group"
	strategy_list: SelectStgType[]
	cap_weight?: number
	isFold: boolean
	re_timing?: ReTimingType
	remark_name?: string
}

export type PosStrategyType = {
	name: string
	type: "pos"
	hold_period: string
	offset_list: number[]
	max_select_num: number
	rebalance_time: string
	factor_list: any[]
	params: object
	strategy_pool: SelectStgType[] | StgGroupType[]
	cap_weight: number
	isFold: boolean
	re_timing?: ReTimingType
	remark_name?: string
}
