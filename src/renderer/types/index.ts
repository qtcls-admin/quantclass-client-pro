/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type { SettingsType } from "./settings.js"
export type { RealMarketConfigType } from "./trading.js"

// 定义一个基础策略类型
export interface BaseStrategy {
	name: string
	offset_list: (string | number)[]
	factors?: Record<string, string[]>
	select_num: number | string | (number | null)[]
	cap_weight: number
	info?: string
	update_time?: string
	isDefault?: boolean
}
