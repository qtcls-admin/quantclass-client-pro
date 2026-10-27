/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { Button } from "@/renderer/components/ui/button"
import { Checkbox } from "@/renderer/components/ui/checkbox"
import DatePicker from "@/renderer/components/ui/date-picker"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Input } from "@/renderer/components/ui/input"
import {
	POS_MGMT_STRATEGY_CONFIG,
	STOCK_QUANT_STRATEGY_CONFIG,
} from "@/renderer/constant"
import { SettingsGearIcon } from "@/renderer/icons/SettingsGearIcon"
import {
	backtestConfigAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import dayjs from "dayjs"
import { useDebounceFn, useMount } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import {
	BadgeJapaneseYen,
	ClockArrowDown,
	ClockArrowUp,
	ListFilterPlus,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export function BacktestSettings() {
	const [backtestConfig, setBacktestConfig] = useAtom(backtestConfigAtom)
	const { getStoreValue, setStoreValue } = window.electronAPI
	const initialCash = backtestConfig.initial_cash
	const startDate = backtestConfig.start_date
	const endDate = backtestConfig.end_date
	const [editSettings, setEditSettings] = useState(false)
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const configKey = useMemo(() => {
		return isMember ? POS_MGMT_STRATEGY_CONFIG : STOCK_QUANT_STRATEGY_CONFIG
	}, [isMember])

	const debouncedSetEstimatedFund = useDebounceFn(
		(value: number) => {
			if (!value) {
				setBacktestConfig((prev) => ({
					...prev,
					initial_cash: 100000,
				}))
				setStoreValue(`${configKey}.initial_cash`, 100000)
				return
			}

			setBacktestConfig((prev) => ({
				...prev,
				initial_cash: value,
			}))
			setStoreValue(`${configKey}.initial_cash`, Number(value))

			toast.success(`回测初始资金已设置为 ${value}`)
		},
		{ wait: 150 },
	)

	const handleDateChange =
		(key: "start_date" | "end_date") => (date: Date | undefined) => {
			if (date) {
				const formattedDate = dayjs(date).format("YYYY-MM-DD")

				// -- 验证日期范围
				if (
					key === "start_date" &&
					backtestConfig.end_date &&
					dayjs(formattedDate).isAfter(dayjs(backtestConfig.end_date))
				) {
					toast.error("开始日期必须小于结束日期")
					return
				}
				if (
					key === "end_date" &&
					backtestConfig.start_date &&
					dayjs(formattedDate).isBefore(dayjs(backtestConfig.start_date))
				) {
					toast.error("结束日期必须大于开始日期")
					return
				}

				setBacktestConfig((prev) => ({
					...prev,
					[key]: formattedDate,
				}))
				setStoreValue(`${configKey}.${key}`, formattedDate)

				toast.success(
					`选股${key === "start_date" ? "开始" : "结束"}日期已设置为 ${formattedDate}`,
				)
			} else {
				setBacktestConfig((prev) => ({
					...prev,
					[key]: undefined,
				}))
				setStoreValue(`${configKey}.${key}`, null)

				toast.success("选股结束日期已设置为最新的一天")
			}
		}

	useMount(async () => {
		const initialCash = await getStoreValue(
			`${configKey}.initial_cash`,
			"100000",
		)

		if (initialCash === "100000") {
			setStoreValue(`${configKey}.initial_cash`, Number(initialCash))
		}
	})

	useMount(async () => {
		const startDate = await getStoreValue(`${configKey}.start_date`, "")
		// const endDate = await getStoreValue(
		// 	`${configKey}.end_date`,
		// 	"",
		// )

		// if (
		// 	!endDate &&
		// 	dayjs(endDate).format("YYYY-MM-DD") !==
		// 		dayjs(new Date()).format("YYYY-MM-DD")
		// ) {
		// 	setBacktestConfig((prev) => ({
		// 		...prev,
		// 		end_date: new Date(),
		// 	}))
		// }

		if (!startDate) {
			await setStoreValue(
				`${configKey}.start_date`,
				dayjs(backtestConfig.start_date).format("YYYY-MM-DD"),
			)
		}
	})

	const [realMarketConfig, setRealMarketConfig] = useAtom(
		realMarketConfigSchemaAtom,
	)

	return (
		<div className="grid grid-cols-1 space-y-1">
			<div className="flex items-center gap-2">
				<div>
					初始资金：
					<span className="underline mx-0.5">
						￥{initialCash.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
					</span>
					，开始时间：
					<span className="underline mx-0.5">
						{dayjs(startDate).format("YYYY-MM-DD")}
					</span>
					，结束时间：
					<span className="underline mx-0.5">
						{endDate ? dayjs(endDate).format("YYYY-MM-DD") : "今天"}
					</span>
					，选股：
					<span className="underline mx-0.5">
						{realMarketConfig.filter_kcb === "1" ? "过滤" : "不过滤"}科创板
					</span>
					且
					<span className="underline mx-0.5">
						{realMarketConfig.filter_cyb === "1" ? "过滤" : "不过滤"}创业板
					</span>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="p-2"
					onClick={() => setEditSettings(true)}
				>
					<SettingsGearIcon className="size-4 mr-2" />
					设置
				</Button>
			</div>
			<Dialog
				open={editSettings}
				onOpenChange={(value) => setEditSettings(value)}
			>
				<DialogContent className="max-w-xl">
					<DialogHeader className="border-b pb-2">
						<DialogTitle className="flex items-center">
							<SettingsGearIcon className="mr-2" /> 回测设置
						</DialogTitle>
					</DialogHeader>
					<div className="flex justify-start items-start">
						<div className="flex items-center w-36 pt-1">
							<BadgeJapaneseYen className="size-4 mr-2" />
							初始资金
						</div>
						<div>
							<Input
								min={0}
								size={10}
								value={initialCash}
								className="w-44 h-8"
								onBlur={() => {
									debouncedSetEstimatedFund.run(initialCash)
								}}
								onChange={(e) => {
									const value = Number(e.target.value)
									const finalValue =
										!e.target.value || value < 0 || Number.isNaN(value)
											? 100000
											: value
									setBacktestConfig((prev) => ({
										...prev,
										initial_cash: finalValue,
									}))
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const value = Number(e.currentTarget.value)
										const finalValue =
											!e.currentTarget.value || value < 0 || Number.isNaN(value)
												? 100000
												: value
										debouncedSetEstimatedFund.run(finalValue)
									}
								}}
							/>

							<span className="text-xs text-muted-foreground">
								和准备实盘的资金大致一致，最终的“资金分配”会使用此数值进行计算
							</span>
						</div>
					</div>
					<div className="flex justify-start items-start">
						<div className="flex items-center w-36 pt-1">
							<ClockArrowDown className="size-4 mr-2" /> 开始时间
						</div>

						<DatePicker
							className="w-44 h-8"
							value={startDate ? new Date(startDate) : undefined}
							onChange={handleDateChange("start_date")}
							disableFutureDates
						/>
					</div>
					<div className="flex justify-start items-start">
						<div className="flex items-center w-36 pt-1">
							<ClockArrowUp className="size-4 mr-2" />
							结束时间
						</div>
						<div>
							<div className="flex gap-2">
								<DatePicker
									className="w-44 h-8"
									value={endDate ? new Date(endDate) : undefined}
									onChange={handleDateChange("end_date")}
									disableFutureDates
								/>

								<Button
									variant="outline"
									className="h-8 text-foreground"
									disabled={
										dayjs(endDate).format("YYYY-MM-DD") ===
										dayjs(new Date()).format("YYYY-MM-DD")
									}
									onClick={() => {
										setBacktestConfig((prev) => ({
											...prev,
											end_date: undefined,
										}))
										setStoreValue(`${configKey}.end_date`, null)

										toast.success("选股结束日期已设置为最新的一天")
									}}
								>
									设为今天
								</Button>
							</div>
							<span className="text-xs text-muted-foreground">
								默认不需要修改，“设为今天”后，可以自动使用最新日期为结束时间
							</span>
						</div>
					</div>
					<div className="flex justify-start items-start">
						<div className="flex items-center w-36">
							<ListFilterPlus className="size-4 mr-2" />
							交易板块
						</div>
						<div>
							<div className="flex gap-2">
								<div className="flex items-center gap-1">
									<Checkbox
										checked={realMarketConfig.filter_kcb === "1"}
										onCheckedChange={(checked) => {
											const formattedValues = {
												...realMarketConfig,
												filter_kcb: checked,
												filter_cyb: realMarketConfig.filter_cyb === "1",
												filter_bj: realMarketConfig.filter_bj === "1",
											}
											setStoreValue("real_market_config", formattedValues)
											setRealMarketConfig({
												...realMarketConfig,
												filter_kcb: checked ? "1" : "0",
											})

											toast.success(checked ? "过滤科创板" : "不过滤科创板")
										}}
									/>
									<span className="text-sm">过滤科创板</span>
								</div>
								<div className="flex items-center gap-1">
									<Checkbox
										checked={realMarketConfig.filter_cyb === "1"}
										onCheckedChange={(checked) => {
											const formattedValues = {
												...realMarketConfig,
												filter_kcb: realMarketConfig.filter_kcb === "1",
												filter_cyb: checked,
												filter_bj: realMarketConfig.filter_bj === "1",
											}
											setStoreValue("real_market_config", formattedValues)
											setRealMarketConfig({
												...realMarketConfig,
												filter_cyb: checked ? "1" : "0",
											})
											toast.success(checked ? "过滤创业板" : "不过滤创业板")
										}}
									/>
									<span className="text-sm">过滤创业板</span>
								</div>
								<div className="flex items-center gap-1">
									<Checkbox
										checked={realMarketConfig.filter_bj === "1"}
										onCheckedChange={(checked) => {
											const formattedValues = {
												...realMarketConfig,
												filter_kcb: realMarketConfig.filter_kcb === "1",
												filter_cyb: realMarketConfig.filter_cyb === "1",
												filter_bj: checked,
											}
											setStoreValue("real_market_config", formattedValues)
											setRealMarketConfig({
												...realMarketConfig,
												filter_bj: checked ? "1" : "0",
											})
											toast.success(checked ? "过滤北交所" : "不过滤北交所")
										}}
									/>
									<span className="text-sm">过滤北交所</span>
								</div>
							</div>

							<span className="text-xs text-muted-foreground">
								控制最后的选股结果，是否会包含创业板和科创板的股票
							</span>
						</div>
					</div>
					<DialogFooter className="border-t p-4">
						<Button
							variant="default"
							size="sm"
							className="line-height-1"
							onClick={() => setEditSettings(false)}
						>
							完成
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
