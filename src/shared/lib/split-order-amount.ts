/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

const SPLIT_ORDER_MIN = 6000
const SPLIT_ORDER_MAX = 12000

export type SplitOrderMultiplier = 1 | 3

export function randomSplitOrderAmount(
	multiplier: SplitOrderMultiplier = 1,
): number {
	const min = SPLIT_ORDER_MIN * multiplier
	const max = SPLIT_ORDER_MAX * multiplier
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function parseSplitOrderAmount(value: unknown): number | undefined {
	if (value === undefined || value === "") return undefined
	const num = typeof value === "string" ? Number(value) : value
	if (typeof num !== "number" || Number.isNaN(num)) return undefined
	const valid1X = num >= SPLIT_ORDER_MIN && num <= SPLIT_ORDER_MAX
	const valid3X = num >= SPLIT_ORDER_MIN * 3 && num <= SPLIT_ORDER_MAX * 3
	if (valid1X || valid3X) return num
	return undefined
}

export function parseSplitOrderMultiplier(raw: unknown): SplitOrderMultiplier {
	return raw === "3" || raw === 3 ? 3 : 1
}
