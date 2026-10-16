/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export const FEN_CLASS_URL =
	"https://pay.quantclass.cn/product/896c3a45-938d-46b6-9755-dbc7aeffa999"

export const FEN_CLASS_URL_BY_YEAR = {
	2024: "https://bbs.quantclass.cn/thread/46409",
	2025: "https://pay.quantclass.cn/product/e4bde609-73d7-434b-8e82-5614c4521629",
	2026: "https://pay.quantclass.cn/product/896c3a45-938d-46b6-9755-dbc7aeffa999",
} as const

export const FEN_CLIENT_PRODUCT_PATH_BY_YEAR = {
	2025: "/client/product/e4bde609-73d7-434b-8e82-5614c4521629",
	2026: "/client/product/896c3a45-938d-46b6-9755-dbc7aeffa999",
} as const

export const FEN_CLASS_LINKS = [
	{ year: 2024, label: "2024期策略分享会", bg: "#8C6C91" },
	{ year: 2025, label: "2025期策略分享会", bg: "#EF8152" },
	{ year: 2026, label: "2026期策略分享会", bg: "#BD9783" },
] as const satisfies ReadonlyArray<{
	year: keyof typeof FEN_CLASS_URL_BY_YEAR
	label: string
	bg: string
}>
