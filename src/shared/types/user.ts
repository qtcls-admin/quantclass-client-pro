/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export interface UserAccountInfo {
	id: string
	uuid: string
	openid?: string
	unionid?: string
	apiKey: string
	headimgurl: string
	isMember: boolean
	// 参加小组信息
	groupInfo: string[]
	nickname: string
	membershipInfo: string[]
	approval: {
		block: boolean
		crypto?: boolean
		stock: boolean
	}
}

export interface WebUserInfo {
	user: UserAccountInfo | null
	isLoggedIn: boolean
}

export interface RoleInfo {
	label: string
	disabled: boolean
}

export interface UserRoles {
	fen: RoleInfo
	coin: RoleInfo
	stock: RoleInfo
	block: RoleInfo
}

export interface CreditBalanceResponse {
	nickname: string
	credit_balance: number
}

export type CreditChangeType =
	| "consumption"
	| "gift"
	| "purchase"
	| "refund"
	| "manual"
	| "system"

export interface CreditLedger {
	amount: number
	change_type: CreditChangeType | string
	create_time: string
	nickname: string
	order_id: string
	reason: string
	uuid: string
}

export interface CreditLedgerResponse {
	ledgers: CreditLedger[]
	page: number
	size: number
	total: number
}

export interface UserAccount {
	isLoggedIn: boolean
	user: UserAccountInfo | null
	// 权限信息
	isMember: boolean
	isStock: boolean
	isCrypto: boolean
	isBlock: boolean
	roles: UserRoles
	permissions: string[]
}
