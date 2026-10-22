/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

export type BlacklistItem = {
	code: string
	reason: string
	time: string
	type: "always" | "condition"
	condition?: {
		type: "gain" | "loss" | "abs"
		threshold: number
	}
}

export type RealMarketConfigType = {
	// -- QMT 相关
	qmt_path: string // QMT 安装路径
	account_id: string // 账户号
	qmt_port: string // QMT 端口号
	qmt_mode: "planA" | "planX" // planX Plan X（默认）；planA 券商特邀
	ws_host: string // websocket 主机地址，未配置时为 ''
	ws_port: string // websocket 端口号，未配置时为 ''
	message_robot_url: string // 消息机器人 URL

	// -- 选股相关
	date_start: Date // 计算起始日期
	performance_mode: "EQUAL" | "PERFORMANCE" | "ECONOMY" // 性能模式
	filter_kcb: boolean // 过滤科创板
	filter_cyb: boolean // 过滤创业板
	filter_bj: boolean // 过滤北交所

	// -- 逆回购相关
	reverse_repo_keep: number // 逆回购保留金额
}
