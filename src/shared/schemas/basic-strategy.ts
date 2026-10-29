/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { z } from "zod"

const NameSchema = z.string().min(1, {
	message: "请输入策略名称",
})

const HoldPeriodSchema = z.string().min(1, {
	message: "请选择持仓周期",
})

const SelectNumSchema = z.union([
	z.number(),
	z.string(),
	z.array(z.union([z.number(), z.null()])),
])

const RebalanceTimeSchema = z.string().optional()

export const BasicStgSharedSchema = z
	.object({
		cap_weight: z.number().optional(),
		info: z.any().optional(),
		rebalance_time: RebalanceTimeSchema,
	})
	.passthrough()

export const BasicSelectStgSchema = BasicStgSharedSchema.extend({
	name: NameSchema,
	select_num: SelectNumSchema,
	hold_period: HoldPeriodSchema,
	factor_list: z.array(z.any()),
	filter_list: z.array(z.any()),
}).passthrough()

export const BasicTimingBlockSchema = z
	.object({
		name: z.string().optional(),
		factor_list: z.array(z.any()),
		params: z
			.object({
				mode: z.string().optional(),
				zero_filter: z.boolean().optional(),
				min_bar: z.number().optional(),
				confirm_n: z.number().optional(),
			})
			.optional(),
	})
	.passthrough()

export const BasicTimingStgSchema = BasicStgSharedSchema.extend({
	code: z.string().optional(),
	code_type: z.string().optional(),
	timing: BasicTimingBlockSchema,
}).passthrough()

export const BasicRotationBlockSchema = z
	.object({
		name: z.string().optional(),
		factor_list: z.array(z.any()),
		max_select_num: z.number().optional(),
		params: z
			.object({
				empty_when_all_negative: z.boolean().optional(),
				tie_break: z.string().optional(),
			})
			.optional(),
	})
	.passthrough()

export const BasicRotationStgSchema = BasicStgSharedSchema.extend({
	code_list: z.array(z.string()).optional(),
	code_type: z.string().optional(),
	rotation: BasicRotationBlockSchema,
}).passthrough()
