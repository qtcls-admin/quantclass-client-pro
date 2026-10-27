/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { CiccBseNoticeDialog } from "@/renderer/components/CiccBseNoticeDialog"
import { ClearFactorCacheConfirmDialog } from "@/renderer/components/ClearFactorCacheConfirmDialog"
import { PlanAConfirmDialog } from "@/renderer/components/PlanAConfirmDialog"
import { PerformanceModeSelectTabs } from "@/renderer/components/select-tabs"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
// import { Card, CardContent, CardFooter } from "@/renderer/components/ui/card"
import DatePicker from "@/renderer/components/ui/date-picker"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/renderer/components/ui/form"
import { Input } from "@/renderer/components/ui/input"
import { Label } from "@/renderer/components/ui/label"
import {
	RadioGroup,
	RadioGroupItem,
} from "@/renderer/components/ui/radio-group"
import { Switch } from "@/renderer/components/ui/switch"
import { TabsContent } from "@/renderer/components/ui/tabs"
// import { ScrollArea } from "@/renderer/components/ui/scroll-area"
import {
	usePermissionCheck,
	usePlanXAccount,
	useToggleAutoRealTrading,
} from "@/renderer/hooks"
import { useRealMarketConfig } from "@/renderer/hooks/useRealMarketConfig"
import { realConfigEditModalAtom } from "@/renderer/store"
import { rocketStatusQueryAtom } from "@/renderer/store/query"
import { qmtConnectOkAtom } from "@/renderer/store/rocket-visible"
import {
	accountsAtom,
	ciccBseNoticeDismissedAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { getBrokerNameByAccountId } from "@/renderer/utils/broker"
import {
	parseSplitOrderAmount,
	randomSplitOrderAmount,
} from "@/renderer/utils/split-order-amount"
import { checkPermission } from "@/shared/lib/permission"
import type { AccountsConfigMap } from "@/shared/types/qmt-accounts"
import { zodResolver } from "@hookform/resolvers/zod"
import dayjs from "dayjs"
import { useDebounceFn } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
	CircleHelp,
	Folder,
	PlayCircle,
	Save,
	Shuffle,
	Trash2,
	TriangleAlert,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const {
	setStoreValue,
	getStoreValue,
	rendererLog,
	openUrl,
	checkKernalRunning,
	checkStartupQmtConnect,
} = window.electronAPI

const QmtConfigFieldsSchema = z.object({
	qmt_path: z.string(),
	account_id: z.string().min(1, { message: "账户号未填写" }),
	qmt_port: z.string().min(1, { message: "QMT 端口号未填写" }),
	qmt_mode: z.enum(["planA", "planX"]),
	ws_host: z.string(),
	ws_port: z.string(),
	use_open_sell: z.enum(["0", "1"]),
})

const PlanXConfigFieldsSchema = z.object({
	account_id: z.string().min(1, { message: "账户号未填写" }),
	qmt_path: z.string(),
	exported_dir: z.string(),
	copy_paste_optimize: z.boolean(),
})

function refineQmtPathRequired(
	data: { qmt_path: string },
	ctx: z.RefinementCtx,
) {
	if (!data.qmt_path.trim()) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "QMT 安装路径未填写",
			path: ["qmt_path"],
		})
	}
}

function refinePlanXPathsRequired(
	data: z.infer<typeof PlanXConfigFieldsSchema>,
	ctx: z.RefinementCtx,
) {
	refineQmtPathRequired(data, ctx)
	if (!data.exported_dir.trim()) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "QMT 导出路径未填写",
			path: ["exported_dir"],
		})
	}
}

function refineBigQmtWsOptional(
	data: z.infer<typeof QmtConfigFieldsSchema>,
	ctx: z.RefinementCtx,
) {
	if (data.qmt_mode === "planA") return

	const wsPort = data.ws_port.trim()
	if (!wsPort) return

	const port = Number(wsPort)
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "websocket 端口号不合法",
			path: ["ws_port"],
		})
	}
}

function refinePlanAConfig(
	data: z.infer<typeof QmtConfigFieldsSchema>,
	ctx: z.RefinementCtx,
) {
	refineQmtPathRequired(data, ctx)
	refineBigQmtWsOptional(data, ctx)
}

export const QmtConfigSchema =
	QmtConfigFieldsSchema.superRefine(refinePlanAConfig)

export const PlanXConfigSchema = PlanXConfigFieldsSchema.superRefine(
	refinePlanXPathsRequired,
)

const RealMarketFormSchema = z.object({
	date_start: z.date().optional(),
	message_robot_url: z.string().optional(),
	filter_kcb: z.enum(["0", "1"]),
	filter_cyb: z.enum(["0", "1"]),
	filter_bj: z.enum(["0", "1"]),
	// -- 均衡-EQUAL，性能-PERFORMANCE，节能-ECONOMY
	performance_mode: z.enum(["EQUAL", "PERFORMANCE", "ECONOMY"]),
	reverse_repo_keep: z.union([z.string(), z.number()]).refine(
		(value) => {
			const numValue =
				typeof value === "string" ? Number.parseFloat(value) : value
			return !Number.isNaN(numValue) && numValue >= 0
		},
		{ message: "逆回购保留金额必须是一个大于等于0的数字" },
	),
	split_order_amount: z.union([z.number(), z.string()]).optional(),
	split_order_multiplier: z.enum(["1", "3"]).optional(),
})

export const RealMarketConfigSchema = RealMarketFormSchema.merge(
	QmtConfigFieldsSchema,
).superRefine(refinePlanAConfig)

type FormData = z.infer<typeof RealMarketFormSchema>
type PlanAFormData = z.infer<typeof QmtConfigSchema>
type PlanXFormData = z.infer<typeof PlanXConfigSchema>

interface TradingConfigFormProps {
	onGoToQmt?: () => void
}

export function TradingConfigForm({ onGoToQmt }: TradingConfigFormProps) {
	const { selectDirectory, createRealTradingDir, clearFactorCache } =
		window.electronAPI
	const { data: rocketStatus = false } = useAtomValue(rocketStatusQueryAtom)
	const { permissions } = useAtomValue(userAtom)
	const { checkWithToast } = usePermissionCheck()
	const isMemberOrStock = checkPermission(permissions, "isMember", "isStock")
	const isMember = checkPermission(permissions, "isMember")
	const [choosing, setChoosing] = useState(false)
	const [realMarketConfig, setRealMarketConfig] = useAtom(
		realMarketConfigSchemaAtom,
	)
	const planXAccount = usePlanXAccount()
	const setAccounts = useSetAtom(accountsAtom)

	const { setPerformanceMode } = useRealMarketConfig()

	const setRealConfigEditModal = useSetAtom(realConfigEditModalAtom)
	const setQmtConnectOk = useSetAtom(qmtConnectOkAtom)
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading()
	const [ciccDismissed, setCiccDismissed] = useAtom(ciccBseNoticeDismissedAtom)
	const [showCiccNotice, setShowCiccNotice] = useState(false)
	const [factorCacheConfirmOpen, setFactorCacheConfirmOpen] = useState(false)
	const [planAConfirmOpen, setPlanAConfirmOpen] = useState(false)

	const isCiccBroker =
		getBrokerNameByAccountId(realMarketConfig.account_id ?? "") === "中金"

	const defaultValues = useMemo(() => {
		const isCicc =
			getBrokerNameByAccountId(realMarketConfig.account_id ?? "") === "中金"
		return {
			date_start:
				typeof realMarketConfig.date_start === "string"
					? new Date(realMarketConfig.date_start)
					: realMarketConfig.date_start,
			message_robot_url: realMarketConfig.message_robot_url ?? "",
			filter_kcb: realMarketConfig.filter_kcb,
			filter_cyb: realMarketConfig.filter_cyb,
			filter_bj: isCicc ? "1" : realMarketConfig.filter_bj,
			performance_mode: realMarketConfig.performance_mode ?? "EQUAL",
			reverse_repo_keep: realMarketConfig.reverse_repo_keep ?? 1000,
			split_order_amount: realMarketConfig.split_order_amount ?? "",
			split_order_multiplier:
				(realMarketConfig.split_order_multiplier as "1" | "3") ?? "1",
		}
	}, [realMarketConfig])

	const planADefaultValues = useMemo(
		(): PlanAFormData => ({
			qmt_path: realMarketConfig.qmt_path ?? "",
			account_id: realMarketConfig.account_id ?? "",
			qmt_port: realMarketConfig.qmt_port ?? "58610",
			qmt_mode: realMarketConfig.qmt_mode === "planA" ? "planA" : "planX",
			ws_host: realMarketConfig.ws_host ?? "",
			ws_port: realMarketConfig.ws_port ?? "",
			use_open_sell: realMarketConfig.use_open_sell ?? "0",
		}),
		[realMarketConfig],
	)

	const planXDefaultValues = useMemo(
		() => ({
			account_id: planXAccount.account_id,
			qmt_path: planXAccount.qmt_path,
			exported_dir: planXAccount.exported_dir,
			copy_paste_optimize: planXAccount.copy_paste_optimize,
		}),
		[planXAccount],
	)

	const form = useForm<FormData>({
		mode: "onChange",
		resolver: zodResolver(RealMarketFormSchema),
		defaultValues,
	})

	const planAForm = useForm<PlanAFormData, unknown, PlanAFormData>({
		mode: "onChange",
		resolver: zodResolver(QmtConfigSchema),
		defaultValues: planADefaultValues,
	})

	const planXForm = useForm<PlanXFormData>({
		mode: "onChange",
		resolver: zodResolver(PlanXConfigSchema),
		defaultValues: planXDefaultValues,
	})

	const qmtMode = planAForm.watch("qmt_mode")
	const isPlanA = qmtMode === "planA"
	const planAAccountId = planAForm.watch("account_id")
	const planXAccountId = planXForm.watch("account_id")
	const activeAccountId = isPlanA ? planAAccountId : planXAccountId
	const isQmtCiccBroker =
		getBrokerNameByAccountId(activeAccountId ?? "") === "中金"

	useEffect(() => {
		if (!isPlanA) {
			planAForm.clearErrors("qmt_path")
			return
		}
		planAForm.clearErrors(["ws_host", "ws_port"])
		void planAForm.trigger("qmt_path")
	}, [isPlanA, planAForm])

	useEffect(() => {
		if (isCiccBroker) {
			form.setValue("filter_bj", "1")
		}
	}, [isCiccBroker, form])

	const ensureCanEditConfig = async () => {
		if (
			!checkWithToast({
				requireMemberOrStock: true,
				windowsOnly: true,
				onlyIn2025: true,
			}).isValid
		) {
			return false
		}
		if (rocketStatus) {
			toast.dismiss()
			toast.warning("实盘中，请暂停实盘，再进行配置")
			return false
		}
		return true
	}

	const persistPlanAQmtConfig = async () => {
		if (isQmtCiccBroker) {
			form.setValue("filter_bj", "1")
		}

		const existing = ((await getStoreValue("real_market_config", {})) ??
			{}) as Record<string, unknown>
		const values = planAForm.getValues()
		const formattedValues = {
			...existing,
			...values,
			qmt_mode: "planA" as const,
			...(isQmtCiccBroker ? { filter_bj: true } : {}),
		}

		await setStoreValue("real_market_config", formattedValues)
		setRealMarketConfig((prev) => ({
			...prev,
			...values,
			qmt_mode: "planA",
			...(isQmtCiccBroker ? { filter_bj: "1" } : {}),
		}))
	}

	const persistPlanXQmtConfig = async () => {
		if (isQmtCiccBroker) {
			form.setValue("filter_bj", "1")
		}

		const existing = ((await getStoreValue("real_market_config", {})) ??
			{}) as Record<string, unknown>
		const values = planXForm.getValues()
		const id = values.account_id.trim()
		const nextAccounts: AccountsConfigMap = {
			[id]: {
				qmt_path: values.qmt_path,
				exported_dir: values.exported_dir,
				copy_paste_optimize: false,
			},
		}

		await setStoreValue("accounts", nextAccounts)
		setAccounts(nextAccounts)

		await setStoreValue("real_market_config", {
			...existing,
			qmt_mode: "planX",
			...(isQmtCiccBroker ? { filter_bj: true } : {}),
		})
		setRealMarketConfig((prev) => ({
			...prev,
			qmt_mode: "planX",
			...(isQmtCiccBroker ? { filter_bj: "1" } : {}),
		}))
	}

	const ensureQmtConfigValid = async (
		options: { redirectOnFailure?: boolean } = {},
	) => {
		const { redirectOnFailure = false } = options
		const isValid = isPlanA
			? await planAForm.trigger()
			: await planXForm.trigger()
		if (!isValid) {
			toast.error(redirectOnFailure ? "请先完善 QMT 配置" : "QMT 配置不合法")
			const errors = isPlanA
				? planAForm.formState.errors
				: planXForm.formState.errors
			await rendererLog(
				"error",
				`QMT 配置表单数据不合法: ${JSON.stringify(errors)}`,
			)
			if (redirectOnFailure) onGoToQmt?.()
			return false
		}
		return true
	}

	const handleSave = async () => {
		try {
			if (!(await ensureCanEditConfig())) return false

			const isValid = await form.trigger()
			if (!isValid) {
				toast.error("表单数据不合法")
				await rendererLog(
					"error",
					`实盘配置表单数据不合法: ${JSON.stringify(form.formState.errors)}`,
				)
				return false
			}

			if (
				parseSplitOrderAmount(form.getValues("split_order_amount")) ===
				undefined
			) {
				toast.error("请先点击随机生成拆单金额（6000～12000）")
				return false
			}

			await createRealTradingDir()

			const values = form.getValues()
			const existing = ((await getStoreValue("real_market_config", {})) ??
				{}) as Record<string, unknown>

			// -- 处理 start_date，确保保存的是字符串；QMT 字段沿用已有配置
			const { date_start, split_order_amount, ...restValues } = values
			const formattedValues = {
				...existing,
				...restValues,
				filter_kcb: values.filter_kcb !== "0",
				filter_cyb: values.filter_cyb !== "0",
				filter_bj: values.filter_bj !== "0",
				date_start: date_start
					? dayjs(date_start).format("YYYY-MM-DD")
					: existing.date_start,
				split_order_amount: Number(split_order_amount),
			}

			setPerformanceMode(values.performance_mode)
			await setStoreValue("real_market_config", formattedValues)
			setRealMarketConfig((prev) => ({
				...prev,
				...values,
				split_order_amount: Number(split_order_amount),
			}))

			toast.success("实盘配置保存成功")
			return true
		} catch (error) {
			toast.error("实盘配置保存失败")
			return false
		}
	}

	const checkPlanAQmtConnectivityAfterSave = async () => {
		if (planAForm.getValues("qmt_mode") !== "planA") return true

		try {
			const res = await checkStartupQmtConnect()
			setQmtConnectOk(res.ok)
			await setStoreValue("qmt_connect_ok", res.ok)
			if (res.ok) return true
			toast.error(res.message, { description: res.detail })
			return false
		} catch {
			setQmtConnectOk(false)
			await setStoreValue("qmt_connect_ok", false)
			toast.error("QMT 连通性检查失败，请稍后重试")
			return false
		}
	}

	const handleSaveQmt = async () => {
		try {
			if (!(await ensureCanEditConfig())) return false

			if (!(await ensureQmtConfigValid())) return false

			if (isPlanA) {
				await persistPlanAQmtConfig()
			} else {
				await persistPlanXQmtConfig()
			}

			const connectOk = await checkPlanAQmtConnectivityAfterSave()
			if (!connectOk) return false

			toast.success("QMT 配置保存成功")
			return true
		} catch (error) {
			toast.error("QMT 配置保存失败")
			return false
		}
	}

	const handleFolderSelect = useDebounceFn(
		async (field: "qmt_path" | "exported_dir", target: "planA" | "planX") => {
			if (choosing) return

			setChoosing(true)
			try {
				const res = (await selectDirectory()) as string

				if (res) {
					if (target === "planA") {
						planAForm.setValue("qmt_path", res, { shouldValidate: true })
					} else {
						planXForm.setValue(field, res, { shouldValidate: true })
					}
				}
			} finally {
				setChoosing(false)
			}
		},
		{ wait: 100 },
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies:
	useEffect(() => {
		form.reset(defaultValues)
		planAForm.reset(planADefaultValues)
		planXForm.reset(planXDefaultValues)
	}, [])

	const renderFormActions = ({
		saveLabel,
		onSave,
		needCiccNotice,
		checkQmtOnStart = false,
	}: {
		saveLabel: string
		onSave: () => Promise<boolean | undefined>
		needCiccNotice: boolean
		checkQmtOnStart?: boolean
	}) => (
		<>
			<hr />
			<div className="flex justify-center gap-2">
				<Button
					size="sm"
					onClick={() => {
						if (needCiccNotice && !ciccDismissed) {
							setShowCiccNotice(true)
						} else {
							void onSave()
						}
					}}
				>
					<Save className="mr-2 size-4" />
					{saveLabel}
				</Button>
				<Button
					size="sm"
					variant="success"
					onClick={async () => {
						if (needCiccNotice && !ciccDismissed) {
							setShowCiccNotice(true)
						} else {
							const isSuccess = await onSave()
							if (!isSuccess) return
							if (checkQmtOnStart) {
								if (!(await ensureQmtConfigValid({ redirectOnFailure: true })))
									return
								if (isPlanA) {
									await persistPlanAQmtConfig()
								} else {
									await persistPlanXQmtConfig()
								}
							}
							if (await handleToggleAutoRocket(true))
								setRealConfigEditModal(false)
						}
					}}
					disabled={isAutoRocket}
				>
					<PlayCircle className="mr-2 size-4" />
					{isAutoRocket ? "正在实盘自动更新" : "保存配置并启动"}
				</Button>
			</div>
		</>
	)

	return (
		// <Card className="flex-1 overflow-hidden border bg-transparent shadow-none">
		// 	<CardContent className="p-0">
		// 		<ScrollArea className="h-full">
		<>
			<Form {...form}>
				<TabsContent value="config" className="mt-4 space-y-4">
					<form className="w-full space-y-4 flex flex-col gap-4">
						<div className="grid grid-cols-4 gap-x-4">
							<div className="flex items-center space-x-2">
								<FormField
									name="filter_kcb"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2 items-start">
											<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
												<span className="font-semibold">过滤科创板</span>{" "}
												<span className="text-destructive">*</span>
												<ButtonTooltip
													content={
														<div>
															<p>
																选择“过滤”，系统会禁止所有策略选择对应板块的股票
															</p>
															<p>
																选择“不过滤”，所有策略都不会过滤，如果需要针对单个策略做过滤，请参考帖子：
																<span
																	onKeyDown={(e) => {
																		if (e.key === "Enter" || e.key === " ") {
																			e.preventDefault()
																		}
																	}}
																	onClick={() =>
																		openUrl("https://qtcls.cn/38022")
																	}
																	className="underline cursor-pointer hover:no-underline"
																>
																	qtcls.cn/38022
																</span>
															</p>
														</div>
													}
												>
													<CircleHelp
														className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
														onClick={(e) => e.stopPropagation()}
													/>
												</ButtonTooltip>
											</FormLabel>

											<FormControl>
												<RadioGroup
													disabled={!isMemberOrStock}
													value={field.value}
													onValueChange={field.onChange}
													className="flex space-x-1"
												>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="0" />
														</FormControl>
														<FormLabel
															className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
														>
															不过滤
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="1" />
														</FormControl>
														<FormLabel
															className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
														>
															过滤
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<div className="flex items-center space-x-2">
								<FormField
									name="filter_cyb"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2 items-start">
											<FormLabel className="!mt-0 flex items-center gap-1">
												<span className="font-semibold">过滤创业板</span>
												<span className="text-destructive">*</span>
												<ButtonTooltip
													content={
														<div>
															<p>
																选择“过滤”，系统会禁止所有策略选择对应板块的股票
															</p>
															<p>
																选择“不过滤”，所有策略都不会过滤，如果需要针对单个策略做过滤，请参考帖子：
																<span
																	onKeyDown={(e) => {
																		if (e.key === "Enter" || e.key === " ") {
																			e.preventDefault()
																		}
																	}}
																	onClick={() =>
																		openUrl("https://qtcls.cn/38022")
																	}
																	className="underline cursor-pointer hover:no-underline"
																>
																	qtcls.cn/38022
																</span>
															</p>
														</div>
													}
												>
													<CircleHelp
														className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
														onClick={(e) => e.stopPropagation()}
													/>
												</ButtonTooltip>
											</FormLabel>

											<FormControl>
												<RadioGroup
													disabled={!isMemberOrStock}
													value={field.value}
													onValueChange={field.onChange}
													className="flex space-x-1"
												>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="0" />
														</FormControl>
														<FormLabel
															className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
														>
															不过滤
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="1" />
														</FormControl>
														<FormLabel
															className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
														>
															过滤
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<div className="flex items-center space-x-2">
								<FormField
									name="filter_bj"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2 items-start">
											<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
												<span className="font-semibold">过滤北交所</span>{" "}
												<span className="text-destructive">*</span>
												{isCiccBroker && (
													<span className="text-yellow-600 dark:text-yellow-500 text-xs font-normal">
														（中金已强制过滤）
													</span>
												)}
											</FormLabel>

											<FormControl>
												<RadioGroup
													disabled={!isMemberOrStock || isCiccBroker}
													value={field.value}
													onValueChange={field.onChange}
													className="flex space-x-1"
												>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="0" />
														</FormControl>
														<FormLabel
															className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
														>
															不过滤
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="1" />
														</FormControl>
														<FormLabel
															className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
														>
															过滤
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<div className="flex items-center space-x-2">
								<FormField
									name="performance_mode"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2 items-start">
											<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
												<span className="font-semibold">性能模式</span>{" "}
												<span className="text-destructive">*</span>
												<ButtonTooltip
													content={
														<div>
															<p>选择"节能"，实盘使用 1/3 系统核心数进行计算</p>
															<p>选择"均衡"，实盘使用 1/2 系统核心数进行计算</p>
															<p>
																选择"性能"，实盘使用 系统核心数 - 1 进行计算
															</p>
														</div>
													}
												>
													<CircleHelp
														className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
														onClick={(e) => e.stopPropagation()}
													/>
												</ButtonTooltip>
											</FormLabel>

											<FormControl>
												<PerformanceModeSelectTabs
													name="性能模式"
													defaultValue={field.value}
													onValueChange={field.onChange}
													showToast={false}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-6">
							<div className="grid grid-cols-2 items-start gap-4">
								<FormField
									name="split_order_amount"
									control={form.control}
									render={({ field }) => {
										const multiplierStr =
											form.watch("split_order_multiplier") ?? "1"
										const multiplier = Number(multiplierStr) as 1 | 3
										const is3X = multiplier === 3
										return (
											<FormItem className="flex flex-col gap-2">
												<FormLabel className="flex min-h-14 items-end gap-1 leading-snug">
													<span>拆单金额</span>
													<span className="text-destructive">*</span>
													<ButtonTooltip
														content={`点击「随机生成」在 ${is3X ? "18000～36000" : "6000～12000"} 间取值，不可手动输入`}
													>
														<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
													</ButtonTooltip>
												</FormLabel>
												<div className="flex h-10 w-full items-center gap-2">
													<FormControl className="min-w-0 flex-1">
														<Input
															ref={field.ref}
															name={field.name}
															onBlur={field.onBlur}
															readOnly
															tabIndex={-1}
															value={
																field.value === "" || field.value === undefined
																	? ""
																	: String(field.value)
															}
															disabled={!isMemberOrStock}
															className="h-10 cursor-default bg-muted/30"
															placeholder="请点击右侧随机生成"
														/>
													</FormControl>
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="h-10 shrink-0 px-3"
														disabled={!isMemberOrStock}
														onClick={(e) => {
															e.preventDefault()
															form.setValue(
																"split_order_amount",
																randomSplitOrderAmount(multiplier),
																{ shouldValidate: true },
															)
														}}
													>
														<Shuffle className="mr-2 h-4 w-4" />
														随机
													</Button>
													{/* 倍数切换 */}
													<div className="flex h-10 shrink-0 items-stretch rounded-lg border bg-muted/40 p-1">
														{(["1", "3"] as const).map((m) => (
															<button
																key={m}
																type="button"
																disabled={!isMemberOrStock}
																onClick={() => {
																	form.setValue("split_order_multiplier", m)
																	// 切换后自动重置拆单金额，避免旧值超出新范围
																	form.setValue("split_order_amount", "")
																}}
																className={`flex min-w-10 items-center justify-center rounded-md px-3.5 text-sm font-semibold transition-all focus-visible:outline-none disabled:opacity-50 ${
																	multiplierStr === m
																		? "bg-neutral-950 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950"
																		: "text-muted-foreground hover:text-foreground"
																}`}
															>
																{m}X
															</button>
														))}
													</div>
												</div>
												{is3X && (
													<div className="animate-pulse flex items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-400">
														<TriangleAlert className="h-3.5 w-3.5 shrink-0" />
														<span>
															3X 拆单金额较大，可能会导致
															<span className="font-semibold">滑点过大</span>
															，请谨慎使用
														</span>
													</div>
												)}
												<FormMessage />
											</FormItem>
										)
									}}
								/>
								<FormField
									name="date_start"
									control={form.control}
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2">
											<FormLabel className="flex min-h-14 items-end leading-snug">
												<span>
													计算起始日期{" "}
													<span className="text-destructive">*</span>
													<span className="text-xs text-muted-foreground">
														运行选股的起始日期，一般参数越大需要越久的日期
													</span>
												</span>
											</FormLabel>
											<FormControl>
												<DatePicker
													{...field}
													disableFutureDates
													className="h-10 w-full"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-cols-2 items-start gap-4">
								<div className="flex min-w-0 flex-col gap-2">
									<FormField
										name="message_robot_url"
										control={form.control}
										render={({ field }) => (
											<FormItem className="flex flex-col gap-2">
												<FormLabel className="flex min-h-14 items-end leading-snug">
													<span>
														消息机器人 URL{" "}
														<span className="text-xs text-muted-foreground">
															机器人配置参考：
														</span>
														<span
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault()
																}
															}}
															onClick={() =>
																openUrl(
																	"https://bbs.quantclass.cn/thread/10975",
																)
															}
															className="underline cursor-pointer hover:no-underline text-xs"
														>
															quantclass/10975
														</span>
													</span>
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														className="h-10 w-full"
														placeholder="可以不填..."
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									{isMember && (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="w-fit text-destructive hover:text-destructive"
											onClick={() => setFactorCacheConfirmOpen(true)}
										>
											<Trash2 className="mr-2 size-4" />
											清除因子缓存
										</Button>
									)}
								</div>
								<FormField
									name="reverse_repo_keep"
									control={form.control}
									render={({ field, formState }) => (
										<FormItem className="flex flex-col gap-2">
											<FormLabel className="flex min-h-14 items-end gap-1 leading-snug">
												<span className="flex flex-wrap items-center gap-1">
													<span>逆回购保留金额</span>
													<span className="text-xs text-muted-foreground">
														如果未了解请不要修改
													</span>
													<ButtonTooltip
														content={
															<div>
																<p>
																	每天尾盘自动买入1天期的逆回购，如果不想全部的钱都买逆回购，可以在这里设置需要保留的金额
																</p>
															</div>
														}
													>
														<CircleHelp
															className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
															onClick={(e) => e.stopPropagation()}
														/>
													</ButtonTooltip>
												</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													{...field}
													value={field.value || ""}
													min={0}
													className="h-10 w-full"
													placeholder="请填写保留金额"
												/>
											</FormControl>
											<FormMessage>
												{formState.errors.reverse_repo_keep?.message}
											</FormMessage>
										</FormItem>
									)}
								/>
							</div>
						</div>
					</form>
					{renderFormActions({
						saveLabel: "保存实盘配置",
						onSave: handleSave,
						needCiccNotice: isCiccBroker,
						checkQmtOnStart: true,
					})}
				</TabsContent>
			</Form>
			<TabsContent value="qmt" className="mt-4 space-y-4">
				<Form {...planAForm}>
					<div className="w-full space-y-4 flex flex-col gap-4">
						<div className="grid grid-cols-2 gap-4 gap-y-6">
							{isMember && (
								<FormField
									name="qmt_mode"
									control={planAForm.control}
									render={({ field }) => (
										<FormItem className="col-span-2">
											<FormLabel className="!mt-0 flex items-center gap-1">
												<span className="font-semibold">交易模式切换</span>{" "}
												<span className="text-destructive">*</span>
												<ButtonTooltip
													content={
														<div className="space-y-1.5">
															<p>
																1. Plan X（默认）：需配置账户号、QMT
																安装路径与导出路径。
															</p>
															<p>
																2. 券商特邀：部分券商提供的 QMT 特邀通道，需配置
																QMT 安装路径。
															</p>
														</div>
													}
												>
													<CircleHelp
														className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
														onClick={(e) => e.stopPropagation()}
													/>
												</ButtonTooltip>
											</FormLabel>
											<FormControl>
												<RadioGroup
													disabled={!isMemberOrStock}
													value={field.value === "planA" ? "planA" : "planX"}
													onValueChange={(value) => {
														if (value === "planA") {
															setPlanAConfirmOpen(true)
															return
														}
														field.onChange(value)
													}}
													className="flex space-x-4"
												>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="planX" />
														</FormControl>
														<FormLabel
															className={`${field.value !== "planA" ? "font-bold" : "font-normal"}`}
														>
															默认模式
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-1 space-y-0">
														<FormControl>
															<RadioGroupItem value="planA" />
														</FormControl>
														<FormLabel
															className={`${field.value === "planA" ? "font-bold" : "font-normal"}`}
														>
															券商特邀
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{isPlanA && (
								<>
									<FormField
										name="qmt_path"
										control={planAForm.control}
										render={({ field }) => (
											<FormItem>
												<FormLabel className="flex items-center gap-2 flex-wrap">
													<span>券商QMT 安装路径</span>
													<span className="text-destructive">*</span>
												</FormLabel>
												<div className="flex w-full gap-2">
													<FormControl className="flex-grow">
														<Input
															{...field}
															readOnly
															disabled={!isMemberOrStock}
															onClick={() =>
																handleFolderSelect.run("qmt_path", "planA")
															}
															placeholder="请选择券商QMT安装路径"
														/>
													</FormControl>
													<Button
														size="sm"
														variant="outline"
														disabled={!isMemberOrStock}
														onClick={(e) => {
															e.preventDefault()
															handleFolderSelect.run("qmt_path", "planA")
														}}
													>
														<Folder className="mr-2 h-4 w-4" />
														<span>选择文件夹</span>
													</Button>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										name="account_id"
										control={planAForm.control}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													资金账户 <span className="text-destructive">*</span>{" "}
													<span className="text-xs text-muted-foreground">
														资金账户，不清楚可以询问客户经理
													</span>
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														disabled={!isMemberOrStock}
														className="w-full"
														placeholder="请填写资金账户号..."
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										name="use_open_sell"
										control={planAForm.control}
										render={({ field }) => (
											<FormItem className="col-span-2">
												<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
													<span className="font-semibold">
														开盘是否挂涨停卖出
													</span>{" "}
													<span className="text-destructive">*</span>
													<span className="text-xs text-muted-foreground">
														该功能需配合新版内核使用
													</span>
													<ButtonTooltip
														content={
															<div className="max-w-sm space-y-2">
																<p className="font-semibold">
																	开盘挂涨停介绍：
																</p>
																<p>
																	"开盘挂涨停"是一种用于保证换仓时获取最大利润的方法。
																</p>
																<p>
																	它会在9点15分的时候把当日需要卖出的股票挂涨停单。理想情况下，这支股票当日在正式换仓前涨停，就可以直接卖出，防止它之后跌下来。
																</p>
																<p>
																	缺点是，它和轧差逻辑冲突，所以可能会出现当日开盘卖出后，到了换仓时间又买回来的情况。
																</p>
																<p>该功能属于高阶玩法，默认不开启。</p>
																<p>rocket内核1.9.6d.20260407及以上</p>
																<p>
																	未升级到新版本的内核【不影响使用】，"开盘挂涨停"功能在老版本中是默认开启的。
																</p>
															</div>
														}
													>
														<CircleHelp
															className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
															onClick={(e) => e.stopPropagation()}
														/>
													</ButtonTooltip>
												</FormLabel>
												<FormControl>
													<RadioGroup
														disabled={!isMemberOrStock}
														onValueChange={async (value) => {
															const isRunning = await checkKernalRunning([
																"rocket",
															])
															if (isRunning) {
																toast.warning(
																	"实盘内核正在运行中，无法修改开盘挂涨停卖出设置",
																)
																return
															}
															field.onChange(value)
														}}
														value={field.value}
														className="flex space-x-1"
													>
														<FormItem className="flex items-center space-x-1 space-y-0">
															<FormControl>
																<RadioGroupItem value="1" />
															</FormControl>
															<FormLabel
																className={`${field.value === "1" ? "font-bold" : "font-normal"}`}
															>
																启用
															</FormLabel>
														</FormItem>
														<FormItem className="flex items-center space-x-1 space-y-0">
															<FormControl>
																<RadioGroupItem value="0" />
															</FormControl>
															<FormLabel
																className={`${field.value === "0" ? "font-bold" : "font-normal"}`}
															>
																禁用
															</FormLabel>
														</FormItem>
													</RadioGroup>
												</FormControl>
											</FormItem>
										)}
									/>

									<div className="relative col-span-2 overflow-hidden rounded-xl border border-amber-200/90 bg-amber-50/70 py-3.5 pr-4 pl-5 dark:border-amber-900/70 dark:bg-amber-950/20">
										<div className="absolute inset-y-0 left-0 w-1 bg-amber-400 dark:bg-amber-500/80" />
										<div className="flex items-start gap-3">
											<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/40 dark:ring-amber-800">
												<TriangleAlert className="size-4 text-amber-500 dark:text-amber-400" />
											</div>
											<div className="min-w-0 space-y-0.5">
												<p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
													保存后将自动检测 QMT 连通性
												</p>
												<p className="text-[13px] leading-5 text-amber-800/90 dark:text-amber-200/80">
													若连接失败，会导致
													<span className="font-bold text-amber-950 dark:text-amber-50">
														无法交易
													</span>
													，请排查连通问题后再次保存。
												</p>
											</div>
										</div>
									</div>

									<FormField
										name="qmt_port"
										control={planAForm.control}
										render={({ field }) => (
											<FormItem className="hidden">
												<FormLabel>
													QMT 端口号 <span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														{...field}
														disabled
														className="w-full"
														placeholder="请填写 qmt 端口号..."
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</>
							)}
						</div>
					</div>
				</Form>

				{!isPlanA && (
					<Form {...planXForm}>
						<div className="grid grid-cols-2 items-start gap-4 gap-y-6">
							<FormField
								name="account_id"
								control={planXForm.control}
								render={({ field }) => (
									<FormItem className="col-span-2">
										<FormLabel>
											资金账户 <span className="text-destructive">*</span>{" "}
											<span className="text-xs text-muted-foreground">
												资金账户，不清楚可以询问客户经理
											</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={!isMemberOrStock}
												className="w-full"
												placeholder="请填写资金账户号..."
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								name="qmt_path"
								control={planXForm.control}
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="flex min-h-5 flex-wrap items-center gap-2">
											<span>券商QMT 安装路径</span>
											<span className="text-destructive">*</span>
										</FormLabel>
										<div className="flex w-full items-center gap-2">
											<FormControl className="flex-grow">
												<Input
													{...field}
													readOnly
													disabled={!isMemberOrStock}
													onClick={() =>
														handleFolderSelect.run("qmt_path", "planX")
													}
													placeholder="请选择券商QMT安装路径"
												/>
											</FormControl>
											<Button
												size="sm"
												variant="outline"
												className="shrink-0"
												disabled={!isMemberOrStock}
												onClick={(e) => {
													e.preventDefault()
													handleFolderSelect.run("qmt_path", "planX")
												}}
											>
												<Folder className="mr-2 h-4 w-4" />
												<span>选择文件夹</span>
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								name="exported_dir"
								control={planXForm.control}
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel className="min-h-5">
											QMT 数据导出路径{" "}
											<span className="text-destructive">*</span>{" "}
											<span className="text-xs text-muted-foreground">
												QMT 数据导出路径，不清楚可以私信询问林奇
											</span>
										</FormLabel>
										<div className="flex w-full items-center gap-2">
											<FormControl className="flex-grow">
												<Input
													{...field}
													readOnly
													disabled={!isMemberOrStock}
													onClick={() =>
														handleFolderSelect.run("exported_dir", "planX")
													}
													placeholder="请选择 QMT 导出数据路径"
												/>
											</FormControl>
											<Button
												size="sm"
												variant="outline"
												className="shrink-0"
												disabled={!isMemberOrStock}
												onClick={(e) => {
													e.preventDefault()
													handleFolderSelect.run("exported_dir", "planX")
												}}
											>
												<Folder className="mr-2 h-4 w-4" />
												<span>选择文件夹</span>
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							{isMember && (
								<FormField
									name="copy_paste_optimize"
									control={planXForm.control}
									render={() => (
										<FormItem className="col-span-2">
											<div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
												<div className="min-w-0 space-y-1">
													<div className="flex items-center gap-1">
														<Label
															htmlFor="copy-paste-optimize"
															className="text-sm font-semibold"
														>
															复制粘贴优化
														</Label>
														<ButtonTooltip
															content={
																<div className="max-w-xs space-y-1.5">
																	<p>
																		关闭：需将选股内核生成的 QMT 策略手动复制到
																		QMT 客户端中运行。
																	</p>
																	<p>开启：无需手动复制策略。</p>
																</div>
															}
														>
															<CircleHelp className="h-4 w-4 text-muted-foreground hover:cursor-pointer" />
														</ButtonTooltip>
													</div>
													<p className="text-xs leading-relaxed text-muted-foreground">
														已关闭：需将选股内核生成的 QMT 策略手动复制到 QMT
														客户端中运行。
													</p>
												</div>
												<Switch
													id="copy-paste-optimize"
													checked={false}
													disabled
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>
					</Form>
				)}

				{renderFormActions({
					saveLabel: "保存 QMT 配置",
					onSave: handleSaveQmt,
					needCiccNotice: isQmtCiccBroker,
				})}
			</TabsContent>
			<ClearFactorCacheConfirmDialog
				open={factorCacheConfirmOpen}
				onOpenChange={setFactorCacheConfirmOpen}
				onConfirm={async () => {
					const res = await clearFactorCache()
					if (res.success) {
						if (res.skipped) {
							toast.info("因子缓存目录不存在，无需清理")
						} else {
							toast.success("因子缓存已清除")
						}
						setFactorCacheConfirmOpen(false)
					} else {
						toast.error(res.message ?? "清除因子缓存失败")
					}
				}}
			/>
			<CiccBseNoticeDialog
				open={showCiccNotice}
				onOpenChange={setShowCiccNotice}
				onConfirm={() => setCiccDismissed(true)}
			/>
			<PlanAConfirmDialog
				open={planAConfirmOpen}
				onOpenChange={setPlanAConfirmOpen}
				onConfirm={() => {
					planAForm.setValue("qmt_mode", "planA")
					setPlanAConfirmOpen(false)
				}}
			/>
		</>
		// 		</ScrollArea>
		// 	</CardContent>

		// 	<CardFooter className="flex justify-end gap-2 p-4 pt-0">
		// 		<Button size="sm" onClick={() => handleSave()}>
		// 			保存实盘配置
		// 		</Button>
		// 	</CardFooter>
		// </Card>
	)
}
