/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import RebTimeConfigModal from "@/renderer/components/RebTimeConfigModal"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { CardContent, CardFooter } from "@/renderer/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/renderer/components/ui/form"
import { Input as InputUI } from "@/renderer/components/ui/input"
import { useFusionManager } from "@/renderer/hooks/useFusionManager"
import { rebTimeConfigAtom } from "@/renderer/store/storage"
import type { PosStrategyType } from "@/renderer/types/strategy"
import { collectFusionRemarkNames } from "@/renderer/utils/strategy"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAtomValue } from "jotai"
import { Biohazard, CircleHelp, Loader, Shuffle } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

function formatRebTimeDisplay(
	time: { hour: number; minute: number; second?: number } | undefined,
): string {
	if (!time) return "--:--:--"
	const hour = time.hour.toString().padStart(2, "0")
	const minute = time.minute.toString().padStart(2, "0")
	const second = (time.second ?? 0).toString().padStart(2, "0")
	return `${hour}:${minute}:${second}`
}

const schema = z.object({
	remark_name: z.string().default(""),
})

export type PosStrategyFormData = z.infer<typeof schema>

export interface PosStrategyFormProps {
	defaultValues: PosStrategyFormData
	posStrategy: PosStrategyType
	fusionIndex: number
	onSuccess: () => void
}

export function PosStrategyForm({
	defaultValues,
	posStrategy,
	fusionIndex,
	onSuccess,
}: PosStrategyFormProps) {
	const [saving, setSaving] = useState(false)
	const [rebTimeConfigModalOpen, setRebTimeConfigModalOpen] = useState(false)
	const { fusion, updateFusionPosStrategy } = useFusionManager()
	const rebTimeConfig = useAtomValue(rebTimeConfigAtom)
	const rebalanceTime = posStrategy.rebalance_time ?? "close-open"
	const form = useForm<PosStrategyFormData>({
		resolver: zodResolver(schema),
		defaultValues,
	})

	const handleSubmit = async () => {
		const isValid = await form.trigger()
		if (!isValid) {
			toast.error("表单数据不合法")
			return
		}
		const data = form.getValues()
		const trimmedRemark = data.remark_name?.trim()
		if (trimmedRemark) {
			const existing = collectFusionRemarkNames(fusion, {
				fusionIndex,
			})
			if (existing.has(trimmedRemark)) {
				toast.error("策略标识已存在，请使用其他标识")
				return
			}
		}
		try {
			await updateFusionPosStrategy(fusionIndex, {
				remark_name: data.remark_name,
			})
			toast.success(`已更新 ${posStrategy.name}（仓位策略）配置`)
			onSuccess()
		} catch {
			toast.error("保存策略失败")
		}
	}

	return (
		<Form {...form}>
			<form>
				<CardContent className="p-0">
					<div className="flex flex-col gap-4 p-4">
						<FormField
							control={form.control}
							name="remark_name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>策略标识</FormLabel>
									<FormControl>
										<InputUI
											{...field}
											placeholder="输入策略唯一标识"
											className="bg-background"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex flex-col gap-3 rounded-lg border bg-gray-100 p-2 dark:bg-black">
							<h3 className="flex items-center gap-1 text-sm font-bold text-warning-600 dark:text-warning">
								<Biohazard className="mr-1 size-4" />
								以下为高阶配置，默认会自动随机生成，无需手动设置。如果你不太了解，千万不要修改！
							</h3>
							<FormItem className="flex flex-col">
								<FormLabel className="flex items-center gap-1">
									<span>🈳 卖出时间</span>
									<ButtonTooltip content="保存时随机生成，或点击下方按钮打开换仓时间配置">
										<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
									</ButtonTooltip>
								</FormLabel>
								<FormControl>
									<div className="flex min-h-9 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
										{rebTimeConfig[rebalanceTime]?.sell_time
											? formatRebTimeDisplay(
													rebTimeConfig[rebalanceTime].sell_time,
												)
											: "--:--:--"}
									</div>
								</FormControl>
								<p className="pl-1 text-xs text-muted-foreground">
									当日换仓：根据换仓时间的 前1分钟 到
									后10分钟，并随机秒数；隔日换仓：收盘前10分钟内随机，并随机秒数
								</p>
							</FormItem>
							<FormItem className="flex flex-col">
								<FormLabel className="flex items-center gap-1">
									<span>🈵 买入时间</span>
									<ButtonTooltip content="保存时随机生成，或点击下方按钮打开换仓时间配置">
										<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
									</ButtonTooltip>
								</FormLabel>
								<FormControl>
									<div className="flex min-h-9 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
										{rebTimeConfig[rebalanceTime]?.buy_time
											? formatRebTimeDisplay(
													rebTimeConfig[rebalanceTime].buy_time,
												)
											: "--:--:--"}
									</div>
								</FormControl>
								<p className="pl-1 text-xs text-muted-foreground">
									分钟换仓：根据随机后的卖出时间，延迟 60 到 120
									秒随机间隔；其他换仓：按开盘时间，随机买入时间
								</p>
							</FormItem>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="w-52"
								onClick={(e) => {
									e.preventDefault()
									setRebTimeConfigModalOpen(true)
								}}
							>
								<Shuffle className="mr-2 h-4 w-4" />
								随机生成换仓时间
							</Button>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex justify-end border-t p-4">
					<Button
						onClick={async (e) => {
							e.preventDefault()
							setSaving(true)
							await handleSubmit()
							setSaving(false)
						}}
						disabled={saving}
					>
						{saving ? (
							<>
								<Loader className="mr-2 h-5 animate-spin" /> 保存中...
							</>
						) : (
							"保存设置"
						)}
					</Button>
				</CardFooter>
			</form>
			<RebTimeConfigModal
				open={rebTimeConfigModalOpen}
				onOpenChange={setRebTimeConfigModalOpen}
			/>
		</Form>
	)
}
