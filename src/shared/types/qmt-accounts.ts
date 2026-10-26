/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface QmtAccountConfig {
	qmt_path: string
	exported_dir: string
	copy_paste_optimize: boolean
}

export type AccountsConfigMap = Record<string, QmtAccountConfig>

export interface PlanXAccountView extends QmtAccountConfig {
	account_id: string
}

const EMPTY_PLAN_X_ACCOUNT: PlanXAccountView = {
	account_id: "",
	qmt_path: "",
	exported_dir: "",
	copy_paste_optimize: false,
}

/**
 * 从 accounts map 解析当前要展示的 Plan X 账户。
 * `accountId` 未传时取 map 第一条（单户阶段）；多账户时由调用方传入当前选中 id。
 */
export function getPlanXAccountView(
	accounts: AccountsConfigMap | null | undefined,
	accountId?: string,
): PlanXAccountView {
	const account_id = accountId?.trim() || Object.keys(accounts ?? {})[0] || ""
	if (!account_id || !accounts?.[account_id]) return EMPTY_PLAN_X_ACCOUNT
	const entry = accounts[account_id]
	return {
		account_id,
		qmt_path: entry.qmt_path ?? "",
		exported_dir: entry.exported_dir ?? "",
		copy_paste_optimize: entry.copy_paste_optimize ?? false,
	}
}
