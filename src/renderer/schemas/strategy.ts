/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { BasicSelectStgSchema } from "@/shared/schemas/basic-strategy.js"
import type { TimeValue } from "react-aria"
import { z } from "zod"

export const NameSchema = z.string().min(1, {
	message: "请输入策略名称",
})

export const HoldPeriodSchema = z.string().min(1, {
	message: "请选择持仓周期",
})

export const SelectNumSchema = z
	.number()
	.positive({
		message: "选股数量必须大于0",
	})
	.or(
		z.string().regex(/^\d+$/, {
			message: "选股数量必须是大于 0 的数字",
		}),
	)

export const SelectNumFormSchema = z.union([z.number(), z.string()]).refine(
	(val) => {
		const num = typeof val === "string" ? Number(val) : val
		return !Number.isNaN(num) && num > 0
	},
	{
		message: "选股数量必须是大于 0 的数字",
	},
)

export const OffsetListSchema = z.array(z.number()).default([0])

export const OffsetListFormSchema = z.string().min(1, {
	message: "请输入偏移列表，多个数字用逗号分隔",
})

export const RebalanceTimeSchema = z.string().optional()

export const SplitOrderAmountSchema = z.number().min(6000).max(12000)

export const SplitOrderAmountFormSchema = z
	.union([z.number(), z.string()])
	.refine(
		(val) => {
			const num = typeof val === "string" ? Number(val) : val
			return !Number.isNaN(num) && num >= 6000 && num <= 12000
		},
		{
			message: "拆单金额须在 6000～12000 之间",
		},
	)

// ===== 因子相关 Schema =====
export const FactorItemSchema = z.union([
	// 支持 4 个元素的元组（没有分钟数据）
	z.tuple([
		z.string(), // 因子名称
		z.boolean(), // 排序方式
		z.any(), // 因子参数
		z.any(), // 因子权重
	]),
	// 支持 5 个元素的元组（有分钟数据）
	z.tuple([
		z.string(), // 因子名称
		z.boolean(), // 排序方式
		z.any(), // 因子参数
		z.any(), // 因子权重
		z.union([z.string(), z.array(z.string())]), // 分钟数据
	]),
])

export const FilterConditionSchema = z
	.string()
	.regex(/^(val|pct|rank):(==|!=|<=|>=|<|>).+$/)

export const FilterItemSchema = z.tuple([
	z.string(), // 因子名称
	z.any(), // 因子参数
	FilterConditionSchema, // 过滤条件
	z.boolean().optional(),
])

// ===== 择时相关 Schema =====

export const TimingSchema = z
	.object({
		name: z.string(),
		limit: z.number(),
		factor_list: z.array(FactorItemSchema),
		params: z.any(),
		signal_time: z.string().optional(),
		recall_days: z.number().optional(),
		fallback_position: z.number().optional(),
	})
	.passthrough() // 允许额外的字段
	.optional()

// ===== 时间相关 Schema =====

export const TimeStringSchema = z.string()

export const TimeValueSchema = z.custom<TimeValue>()

// ===== 分享会选股策略 Schema =====
/**
 * 在基础选股字段之上扩展会员专属字段
 */
export const SelectStgSchema = BasicSelectStgSchema.extend({
	remark_name: z.string().optional().default(""),
	cap_weight: z.number().default(0),
	offset_list: OffsetListSchema,
	cross_sections: z.array(z.any()).optional(), // 截面因子
	stock_timing_list: z.array(z.any()).optional(), // 个股择时
	stock_timing: z.array(z.any()).optional(), // 个股择时策略
	filter_list_post: z.array(z.any()).optional(), // 后置过滤因子列表
	timing: TimingSchema,
	scalein_targets: z.array(z.number()).optional(),
	override: TimingSchema, // 提前离场逻辑
})

export const SelectStgFormSchema = SelectStgSchema.omit({ name: true })
	.extend({
		select_num: SelectNumFormSchema,
		offset_list: OffsetListFormSchema,
	})
	.passthrough() // 允许额外的字段
