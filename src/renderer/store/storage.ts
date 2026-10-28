/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */
import type { RealMarketConfigSchema } from "@/renderer/page/trading/config-form"
import type {
	BasicStgType,
	PosStrategyType,
	SelectStgType,
} from "@/renderer/types/strategy"
import type { AccountsConfigMap } from "@/shared/types/qmt-accounts"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { z } from "zod"

// 版本提示列表
export const versionListAtom = atomWithStorage<string[]>(
	"versionList",
	[],
	undefined,
	{ getOnInit: true },
)
export const backtestConfigAtom = atomWithStorage<{
	initial_cash: number
	start_date: Date
	end_date: Date | undefined
	backtest_name: string
}>(
	"backtestConfig",
	{
		initial_cash: 1000000,
		start_date: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
		end_date: new Date(),
		backtest_name: "默认策略",
	},
	undefined,
	{ getOnInit: true },
)
export const showDataSubModalAtom = atom(false)
export const isLoginAtom = atom(false)
export const totalWeightAtom = atomWithStorage<number>(
	"totalWeight25",
	0,
	undefined,
	{
		getOnInit: true,
	},
)

export const statusExpiresAtom = atomWithStorage<string>(
	"statusExpires",
	"",
	undefined,
	{ getOnInit: true },
)

export const isAutoLaunchUpdateAtom = atomWithStorage<boolean>(
	"isAutoLaunchUpdate",
	false,
	undefined,
	{ getOnInit: true },
)

// 策略选择，疑似为是否之前是否实盘的逻辑，目前已经废弃，需要逐步替换。2025-02-25 14:46:16
export const stgSelectionAtom = atomWithStorage<Record<string, boolean>>(
	"strategySelection",
	{},
	undefined,
	{ getOnInit: true },
)

// 基础课程选股策略
export const selectStgListAtom = atomWithStorage<BasicStgType[]>(
	"selectStockStrategy25",
	[],
	undefined,
	{ getOnInit: true },
)

// 资金曲线再择时（选股模式下）
export const reTimingAtom = atomWithStorage<{
	name: string
	params: any[]
} | null>("reTiming", null, undefined, { getOnInit: true })

// 仓位策略
export const fusionAtom = atomWithStorage<any[]>("fusion", [], undefined, {
	getOnInit: true,
})

// 换仓时间配置，按 rebalance_time 分组
export const rebTimeConfigAtom = atomWithStorage<
	Record<string, RebTimeConfig<SelectStgType | PosStrategyType>>
>("rebTimeConfig", {}, undefined, { getOnInit: true })

/** 与策略名一一对应的运行时字段。拆单金额已改为 real_market_config，此处暂不写入。 */
export type StrategyRuntimeConfig = Record<string, never>
export const strategyRuntimeConfigAtom = atomWithStorage<
	Record<string, StrategyRuntimeConfig>
>("strategyRuntimeConfig", {}, undefined, { getOnInit: true })

export const accountKeyAtom = atomWithStorage<{
	apiKey: string
	uuid: string
}>(
	"accountKey",
	{
		apiKey: "",
		uuid: "",
	},
	undefined,
	{ getOnInit: true },
)

// 0: 路人
// 1: 基础课程学生
// 2: 分享会学生
// export const accountRoleAtom = atomWithStorage<{
// 	msg: string
// 	role: 0 | 1 | 2
// }>("accountRole", { msg: "NONE", role: 0 }, undefined, { getOnInit: true })

export const isAutoLoginAtom = atomWithStorage<boolean>(
	"isAutoLogin",
	true,
	undefined,
	{ getOnInit: true },
)

// export const isAutoRocketAtom = atomWithStorage<boolean>(
// 	"isAutoRocket",
// 	false,
// 	undefined,
// 	{ getOnInit: true },
// )

export const realMarketConfigSchemaAtom = atomWithStorage<
	Partial<z.infer<typeof RealMarketConfigSchema>>
>(
	"realMarketConfig",
	{
		qmt_path: "",
		account_id: "",
		qmt_port: "58610",
		qmt_mode: "planX",
		ws_host: "",
		ws_port: "",
		message_robot_url: "",
		filter_kcb: "1",
		filter_cyb: "1",
		filter_bj: "1",
		performance_mode: "EQUAL",
		use_open_sell: "0",
		date_start: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
	},
	undefined,
	{ getOnInit: true },
)

export const accountsAtom = atom<AccountsConfigMap>({})

export const showMoneyAtom = atomWithStorage<boolean>(
	"showMoney",
	true,
	undefined,
	{ getOnInit: true },
)

// 中金是否已点击「我已知晓不再提示」
export const ciccBseNoticeDismissedAtom = atomWithStorage<boolean>(
	"ciccBseNoticeDismissed",
	false,
	undefined,
	{ getOnInit: true },
)
