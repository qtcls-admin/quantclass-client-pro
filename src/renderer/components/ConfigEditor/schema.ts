/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

// -- 策略配置对象的 Schema
export const strategySchema = {
	type: "object",
	properties: {
		name: {
			type: "string",
			description: "策略名称",
		},
		hold_period: {
			type: "string",
			description: "持仓周期，支持：nD（天）、nW（周）、nM（月）",
			pattern: "^[0-9]+[DWM]$",
		},
		rebalance_time: {
			type: "string",
			description:
				"换仓时间：close-open（隔日换仓）、open（日内早盘）、close（日内尾盘），默认为 close-open",
			// enum: ["close-open", "open", "close"],
			default: "close-open",
		},
		offset_list: {
			type: "array",
			description: "偏移列表",
			items: {
				type: "number",
			},
		},
		select_num: {
			type: ["number", "string", "array"],
			description:
				"选股数量或排名区间：整数为前 N 名，小数为前 N%（如 0.1），[5,10] 为区间；None 表示不限制该侧",
		},
		cap_weight: {
			type: "number",
			description: "策略资金权重",
		},
		factor_list: {
			type: "array",
			description: "选股因子列表，用于设置选股的因子及其参数",
			items: {
				type: "array",
				minItems: 4,
				maxItems: 4,
				items: [
					{
						type: "string",
						description: "因子名称（与 '因子库' 文件中的名称一致）",
					},
					{
						type: "boolean",
						description: "排序方式：true 为升序，false 为降序",
					},
					{
						oneOf: [
							{ type: "number" },
							{ type: "array", items: { type: "number" } },
							{ type: "null" },
						],
						description: "因子参数",
					},
					{ type: "number", description: "因子权重" },
				],
			},
		},
		filter_list: {
			type: "array",
			description: "过滤因子列表，用于设置股票筛选条件",
			items: {
				type: "array",
				minItems: 3,
				maxItems: 3,
				items: [
					{ type: "string", description: "因子名称" },
					{
						oneOf: [
							{ type: "number" },
							{ type: "array", items: { type: "number" } },
							{ type: "null" },
						],
						description: "因子参数",
					},
					{
						type: "string",
						description: "过滤条件，支持 val:== 、val:!= 、pct:<= 等格式",
						pattern: "^(val|pct):(==|!=|<=|>=|<|>).+$",
					},
				],
			},
		},
	},
	required: [
		"name",
		"hold_period",
		"offset_list",
		"select_num",
		"cap_weight",
		"factor_list",
		"filter_list",
	],
} as const

// -- JSON Schema 定义（支持数组或对象）
export const schema = {
	oneOf: [
		strategySchema,
		{
			type: "array",
			items: strategySchema,
			minItems: 1,
		},
	],
} as const
