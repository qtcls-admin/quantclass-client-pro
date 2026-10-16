/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	MemberPromoBanner,
	MemberPromoDialog,
} from "@/renderer/components/member-promo"
import { Button } from "@/renderer/components/ui/button"
import { Input } from "@/renderer/components/ui/input"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { useState } from "react"

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Label } from "@/renderer/components/ui/label"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/renderer/components/ui/select"
import { cn } from "@/renderer/lib/utils"
import type { BlacklistItem } from "@/renderer/types/trading"
import { toast } from "sonner"

export default function BuyBlacklistAddConfirm({
	show,
	setShow,
	stockCode,
	onConfirm,
}: {
	show: boolean
	setShow: (show: boolean) => void
	stockCode: string
	onConfirm: (buyBlacklistItem: BlacklistItem) => void
}) {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [promoOpen, setPromoOpen] = useState(false)
	const [blacklistType, setBlacklistType] = useState<"always" | "condition">(
		"always",
	)
	const [conditionType, setConditionType] = useState<"gain" | "loss" | "abs">(
		"gain",
	)
	const [thresholdValue, setThresholdValue] = useState("9")
	const [reasonInput, setReasonInput] = useState("")

	function handleBlacklistTypeChange(value: string) {
		if (value === "condition" && !isMember) {
			setPromoOpen(true)
			return
		}
		setBlacklistType(value as "always" | "condition")
	}

	// 确认拉黑
	const confirmBlacklist = async () => {
		if (blacklistType === "condition") {
			if (!thresholdValue || thresholdValue.trim() === "") {
				toast.error("请输入阈值")
				return
			}

			const threshold = Number.parseFloat(thresholdValue)
			if (Number.isNaN(threshold)) {
				toast.error("阈值必须是有效的数字")
				return
			}

			if (threshold < 0 || threshold > 20) {
				toast.error("阈值必须在0-20之间")
				return
			}
		}

		const currentTime = new Date()
		const timeStr = `${currentTime.getFullYear()}-${(currentTime.getMonth() + 1).toString().padStart(2, "0")}-${currentTime.getDate().toString().padStart(2, "0")} ${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}:${currentTime.getSeconds().toString().padStart(2, "0")}`

		const newBlacklistItem: BlacklistItem = {
			code: stockCode,
			reason: reasonInput,
			time: timeStr,
			type: blacklistType,
			condition:
				blacklistType === "condition"
					? {
							type: conditionType,
							threshold: Number.parseFloat(
								Number.parseFloat(thresholdValue).toFixed(2),
							),
						}
					: undefined,
		}

		// 使用hook中的方法添加黑名单项
		try {
			onConfirm(newBlacklistItem)
		} catch (error) {
			console.error("保存黑名单失败:", error)
			toast.error("保存失败，请重试")
		}
	}

	return (
		<>
			<Dialog open={show} onOpenChange={setShow}>
				<DialogContent
					className="max-w-lg"
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle>确认拉黑{stockCode}？</DialogTitle>
						<DialogDescription>请补充拉黑的条件和细节</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4">
						{/* 拉黑类型选择 */}
						<div className="grid gap-2">
							<Label>拉黑类型</Label>
							<RadioGroup
								value={blacklistType}
								onValueChange={handleBlacklistTypeChange}
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="always" id="always" />
									<Label htmlFor="always">始终不买入</Label>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<div className="flex items-center space-x-2">
										<RadioGroupItem value="condition" id="condition" />
										<Label htmlFor="condition">条件不买入（涨跌幅限制）</Label>
									</div>
									{!isMember ? (
										<MemberPromoBanner
											learnMoreLabel="了解条件黑名单？"
											onLearnMore={() => setPromoOpen(true)}
										/>
									) : null}
								</div>
							</RadioGroup>
						</div>

						{/* 条件设置 */}
						{blacklistType === "condition" && (
							<div className="grid gap-4 border rounded-lg p-3">
								<div className="grid gap-2">
									<Label>
										涨跌幅条件
										{conditionType === "gain" ? (
											<span className="text-danger"> ↑</span>
										) : conditionType === "loss" ? (
											<span className="text-success"> ↓</span>
										) : (
											<span className="text-warning"> ↑↓</span>
										)}
									</Label>
									<Select
										value={conditionType}
										onValueChange={(value) =>
											setConditionType(value as "gain" | "loss" | "abs")
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="gain">
												<span className="text-danger">●</span> 涨幅超过
											</SelectItem>
											<SelectItem value="loss">
												<span className="text-success">●</span> 跌幅超过
											</SelectItem>
											<SelectItem value="abs">
												<span className="text-warning">●</span> 振幅超过
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>阈值（%）</Label>
									<Input
										type="number"
										placeholder="请输入阈值（0%-20%）"
										value={thresholdValue}
										onChange={(e) => {
											const value = e.target.value
											// 限制只能输入数字和小数点，最多2位小数
											if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
												// 检查数值范围
												if (
													value === "" ||
													(Number.parseFloat(value) >= 0 &&
														Number.parseFloat(value) <= 20)
												) {
													setThresholdValue(value)
												}
											}
										}}
										min="0"
										max="20"
										step="0.01"
										required
									/>
								</div>

								<div className="text-sm">
									在买入下单的瞬间，价格相比于
									<span className="font-bold">前收盘价</span>
									<span
										className={cn(
											"font-bold",
											conditionType === "gain" && "text-danger",
											conditionType === "loss" && "text-success",
											conditionType === "abs" && "text-warning",
										)}
									>
										{conditionType === "gain" && "涨幅"}
										{conditionType === "loss" && "跌幅"}
										{conditionType === "abs" && "振幅"}
										超过{thresholdValue || 0}%
									</span>
									不买入
								</div>
							</div>
						)}

						{/* 拉黑原因 */}
						<div className="grid gap-2">
							<Label htmlFor="reason">拉黑原因（可选）</Label>
							<Input
								id="reason"
								placeholder="请输入拉黑原因（可以为空）"
								value={reasonInput}
								onChange={(e) => setReasonInput(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShow(false)}>
							取消
						</Button>
						<Button
							onClick={confirmBlacklist}
							disabled={
								blacklistType === "condition" &&
								(!thresholdValue ||
									thresholdValue.trim() === "" ||
									Number.parseFloat(thresholdValue) < 0 ||
									Number.parseFloat(thresholdValue) > 20)
							}
						>
							确认拉黑
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />
		</>
	)
}
