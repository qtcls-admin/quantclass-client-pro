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
	BasicRotationStgSchema,
	BasicSelectStgSchema,
	BasicTimingStgSchema,
} from "@/shared/schemas/basic-strategy.js"

/** 基础版选股策略导入字段白名单 */
export const BASIC_SELECT_STRATEGY_IMPORT_LIMIT = 2

const ALLOWED_KEY_SET = new Set([
	...Object.keys(BasicSelectStgSchema.shape),
	...Object.keys(BasicTimingStgSchema.shape),
	...Object.keys(BasicRotationStgSchema.shape),
])

export function getForbiddenBasicStrategyKeys(
	strategy: Record<string, unknown>,
): string[] {
	return Object.keys(strategy).filter((key) => !ALLOWED_KEY_SET.has(key))
}

export type BasicSelectStockImportValidationResult =
	| { ok: true }
	| { ok: false; error: string }

export function isPresentStrategy(
	value: unknown,
): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.keys(value).length > 0
	)
}

/** validate 基础版选股策略导入 */

export function validateBasicSelectStrategy(
	strategy: unknown,
	label = "strategy",
): BasicSelectStockImportValidationResult {
	if (!isPresentStrategy(strategy)) {
		return { ok: false, error: `导入失败：${label} 格式无效` }
	}

	const forbidden = getForbiddenBasicStrategyKeys(strategy)
	if (forbidden.length > 0) {
		const name = strategy.name
		const displayName = typeof name === "string" && name.trim() ? name : "策略"
		return {
			ok: false,
			error: `导入失败：策略「${displayName}」包含基础版不支持的字段：${forbidden.join("、")}`,
		}
	}

	return { ok: true }
}

export function validateBasicStockQuantImport(
	strategy: unknown,
	strategy2?: unknown,
): BasicSelectStockImportValidationResult {
	const first = validateBasicSelectStrategy(strategy, "strategy")
	if (!first.ok) return first

	if (strategy2 == null) return { ok: true }
	if (
		typeof strategy2 === "object" &&
		!Array.isArray(strategy2) &&
		Object.keys(strategy2).length === 0
	) {
		return { ok: true }
	}

	return validateBasicSelectStrategy(strategy2, "strategy2")
}

export interface StockQuantConfig {
	strategy: Record<string, unknown>
	strategy2: Record<string, unknown> | null
	backtest_name?: string
	initial_cash?: number
	start_date?: string | null
	end_date?: string | null
	re_timing?: { name: string; params: unknown[] } | null
}

export function buildStockQuantPayload(
	strategies: unknown[],
): StockQuantConfig | null {
	const present = strategies.filter(isPresentStrategy)
	if (present.length === 0) return null

	return {
		strategy: present[0],
		strategy2: present[1] ?? null,
	}
}

export function stockQuantToStrategyList(stockQuant: unknown): unknown[] {
	if (!isPresentStrategy(stockQuant)) return []
	const list: unknown[] = []
	if (isPresentStrategy(stockQuant.strategy)) list.push(stockQuant.strategy)
	if (isPresentStrategy(stockQuant.strategy2)) list.push(stockQuant.strategy2)
	return list
}
