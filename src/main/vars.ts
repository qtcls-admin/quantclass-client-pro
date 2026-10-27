/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import pkg from "../../package.json"

// 在 Electron 主进程中，环境变量应该从 process.env 获取
export const BASE_URL = process.env.VITE_BASE_URL || "https://api.quantclass.cn"

/** 支付平台api地址 */
export const PAYMENT_GATEWAY_URL = "https://api.quantclass.net"

/** 量化论坛 */
export const BBS_BASE_URL = "https://bbs.quantclass.cn"

/** 量搭子 QuantPal（回测网站） */
export const QUANTPAL_BASE_URL = "https://quantpal.cn"

// 应用版本信息
export const CLIENT_VERSION = `v${pkg.version}`
export const PACKAGE_INFO = pkg

// Stats 文件路径常量
export const ROCKET_STATS_PATH = ["real_trading", "rocket", "data", "ui_status"]
export const SELECT_STATS_PATH = ["real_trading", "data", "ui_status"]

// 个股择时 文件路径常量
export const SELECT_UI_VIEWS_PATH = ["real_trading", "data", "ui_views"]
