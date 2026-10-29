/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export function formatSelectNum(value: unknown): string {
	if (value == null) return "--"
	if (value === -1) return "手工"
	if (Array.isArray(value)) return `[${value.join(", ")}]`
	return String(value)
}

const SELECT_INCLUSIVE_LABEL: Record<string, string> = {
	right: "左开右闭",
	both: "两端包含",
	left: "左闭右开",
}

export function formatSelectInclusive(value?: string | null): string {
	const key = value ?? "both"
	return `${SELECT_INCLUSIVE_LABEL[key] ?? key}（${key}）`
}
