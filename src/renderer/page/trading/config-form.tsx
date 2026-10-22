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
import { Badge } from "@/renderer/components/ui/badge"
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
import { usePermissionCheck, useToggleAutoRealTrading } from "@/renderer/hooks"
import { useRealMarketConfig } from "@/renderer/hooks/useRealMarketConfig"
import { realConfigEditModalAtom } from "@/renderer/store"
import { rocketStatusQueryAtom } from "@/renderer/store/query"
import { qmtConnectOkAtom } from "@/renderer/store/rocket-visible"
import {
	ciccBseNoticeDismissedAtom,
	planXConfigAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { getBrokerNameByAccountId } from "@/renderer/utils/broker"
import type { AccountsConfigMap } from "@/shared/types/qmt-accounts"
import { zodResolver } from "@hookform/resolvers/zod"
import dayjs from "dayjs"
import { useDebounceFn } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
	ChevronRight,
	CircleHelp,
	Folder,
	Monitor,
	PlayCircle,
	Save,
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
	// -- 开盘是否挂涨停卖出: "1" 启用，"0" 禁用
	use_open_sell: z.enum(["0", "1"]),
	reverse_repo_keep: z.union([z.string(), z.number()]).refine(
		(value) => {
			const numValue =
				typeof value === "string" ? Number.parseFloat(value) : value
			return !Number.isNaN(numValue) && numValue >= 0
		},
		{ message: "逆回购保留金额必须是一个大于等于0的数字" },
	),
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
	const { user, isMember } = useAtomValue(userAtom)
	const { data: rocketStatus = false } = useAtomValue(rocketStatusQueryAtom)
	const { checkWithToast } = usePermissionCheck()
	const [choosing, setChoosing] = useState(false)
	const [realMarketConfig, setRealMarketConfig] = useAtom(
		realMarketConfigSchemaAtom,
	)
	const [planXConfig, setPlanXConfig] = useAtom(planXConfigAtom)

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
			use_open_sell: realMarketConfig.use_open_sell ?? "0",
			reverse_repo_keep: realMarketConfig.reverse_repo_keep ?? 1000,
		}
	}, [realMarketConfig])

	const planADefaultValues = useMemo(
		() => ({
			qmt_path: realMarketConfig.qmt_path ?? "",
			account_id: realMarketConfig.account_id ?? "",
			qmt_port: realMarketConfig.qmt_port ?? "58610",
			qmt_mode: realMarketConfig.qmt_mode === "planA" ? "planA" : "planX",
			ws_host: realMarketConfig.ws_host ?? "",
			ws_port: realMarketConfig.ws_port ?? "",
		}),
		[realMarketConfig],
	)

	const planXDefaultValues = useMemo(
		() => ({
			account_id: planXConfig.account_id ?? "",
			qmt_path: planXConfig.qmt_path ?? "",
			exported_dir: planXConfig.exported_dir ?? "",
			copy_paste_optimize: planXConfig.copy_paste_optimize ?? false,
		}),
		[planXConfig],
	)

	const form = useForm<FormData>({
		mode: "onChange",
		resolver: zodResolver(RealMarketFormSchema),
		defaultValues,
	})

	const planAForm = useForm<PlanAFormData>({
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
		if (isPlanA) return

		const id = planXAccountId?.trim()
		if (!id) {
			planXForm.setValue("qmt_path", "")
			planXForm.setValue("exported_dir", "")
			planXForm.setValue("copy_paste_optimize", false)
			return
		}

		void getStoreValue("accounts", {}).then((raw) => {
			const accounts = (raw ?? {}) as AccountsConfigMap
			const entry = accounts[id]
			planXForm.setValue("qmt_path", entry?.qmt_path ?? "")
			planXForm.setValue("exported_dir", entry?.exported_dir ?? "")
			planXForm.setValue(
				"copy_paste_optimize",
				entry?.copy_paste_optimize ?? false,
			)
		})
	}, [isPlanA, planXAccountId, planXForm])

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
				requireMember: true,
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

	const persistQmtConfig = async () => {
		const existing = ((await getStoreValue("real_market_config", {})) ??
			{}) as Record<string, unknown>
		const isPlanAMode = planAForm.getValues("qmt_mode") === "planA"

		if (isQmtCiccBroker) {
			form.setValue("filter_bj", "1")
		}

		if (isPlanAMode) {
			const values = planAForm.getValues()
			await setStoreValue("real_market_config", {
				...existing,
				qmt_path: values.qmt_path,
				account_id: values.account_id,
				qmt_port: values.qmt_port,
				qmt_mode: "planA",
				ws_host: values.ws_host,
				ws_port: values.ws_port,
				...(isQmtCiccBroker ? { filter_bj: true } : {}),
			})
			setRealMarketConfig((prev) => ({
				...prev,
				...values,
				qmt_mode: "planA",
				...(isQmtCiccBroker ? { filter_bj: "1" } : {}),
			}))
			return
		}

		const values = planXForm.getValues()
		const id = values.account_id.trim()
		const accounts = ((await getStoreValue("accounts", {})) ??
			{}) as AccountsConfigMap
		const accountEntry: AccountsConfigMap[string] = {
			qmt_path: values.qmt_path,
			exported_dir: values.exported_dir,
			copy_paste_optimize: values.copy_paste_optimize,
		}
		await setStoreValue("accounts", {
			...accounts,
			[id]: accountEntry,
		})
		const planAQmt = planAForm.getValues()
		await setStoreValue("real_market_config", {
			...existing,
			qmt_mode: "planX",
			qmt_port: planAQmt.qmt_port,
			ws_host: planAQmt.ws_host,
			ws_port: planAQmt.ws_port,
			...(isQmtCiccBroker ? { filter_bj: true } : {}),
		})
		setPlanXConfig(values)
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

			await createRealTradingDir()

			const values = form.getValues()
			const existing = ((await getStoreValue("real_market_config", {})) ??
				{}) as Record<string, unknown>

			// -- 处理 start_date，确保保存的是字符串；QMT 字段沿用已有配置
			const { date_start, ...restValues } = values
			const formattedValues = {
				...existing,
				...restValues,
				filter_kcb: values.filter_kcb !== "0",
				filter_cyb: values.filter_cyb !== "0",
				filter_bj: values.filter_bj !== "0",
				date_start: date_start
					? dayjs(date_start).format("YYYY-MM-DD")
					: existing.date_start,
			}

			setPerformanceMode(values.performance_mode)
			await setStoreValue("real_market_config", formattedValues)
			setRealMarketConfig((prev) => ({
				...prev,
				...values,
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
			if (res.ok) return true
			toast.dismiss()
			toast.error(res.message, { description: res.detail })
			return false
		} catch {
			setQmtConnectOk(false)
			toast.dismiss()
			toast.error("QMT 连通性检查失败，请稍后重试")
			return false
		}
	}

	const handleSaveQmt = async () => {
		try {
			if (!(await ensureCanEditConfig())) return false

			if (!(await ensureQmtConfigValid())) return false

			await persistQmtConfig()

			toast.success("QMT 配置保存成功")
			return await checkPlanAQmtConnectivityAfterSave()
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
								await persistQmtConfig()
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
													disabled={!user?.isMember}
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
													disabled={!user?.isMember}
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
													disabled={!user?.isMember || isCiccBroker}
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

						<div className="grid grid-cols-2 gap-4 gap-y-6">
							<FormItem>
								<FormLabel>
									QMT 配置
									<span className="text-xs text-muted-foreground ml-1">
										QMT相关配置请在 QMT配置 中填写
									</span>
								</FormLabel>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="w-fit"
									onClick={() => onGoToQmt?.()}
								>
									<Monitor className="mr-2 h-4 w-4" />
									前往 QMT配置
									<ChevronRight className="ml-1 h-4 w-4" />
								</Button>
							</FormItem>

							<FormField
								name="date_start"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											计算起始日期 <span className="text-destructive">*</span>
											<span className="text-xs text-muted-foreground">
												运行选股的起始日期，一般参数越大需要越久的日期
											</span>
										</FormLabel>

										<FormControl>
											<DatePicker {...field} disableFutureDates />
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								name="message_robot_url"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel>
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
													openUrl("https://bbs.quantclass.cn/thread/10975")
												}
												className="underline cursor-pointer hover:no-underline text-xs"
											>
												quantclass/10975
											</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												className="w-full"
												placeholder="可以不填..."
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								name="reverse_repo_keep"
								control={form.control}
								render={({ field, formState }) => (
									<FormItem>
										<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
											<span className="font-semibold">逆回购保留金额</span>{" "}
											<span className="text-xs text-muted-foreground">
												如果未了解请不要修改
											</span>{" "}
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
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												value={field.value || ""} // 确保输入框始终有值
												min={0}
												placeholder="请填写保留金额"
											/>
										</FormControl>
										<FormMessage>
											{formState.errors.reverse_repo_keep?.message}
										</FormMessage>
									</FormItem>
								)}
							/>
							<FormField
								name="use_open_sell"
								control={form.control}
								render={({ field }) => (
									<FormItem>
										<FormLabel className="!mt-0 flex items-center gap-1 mr-1">
											<span className="font-semibold">开盘是否挂涨停卖出</span>{" "}
											<span className="text-destructive">*</span>
											<span className="text-xs text-muted-foreground">
												该功能需配合新版内核使用
											</span>
											<ButtonTooltip
												content={
													<div className="max-w-sm space-y-2">
														<p className="font-semibold">开盘挂涨停介绍：</p>
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
												disabled={!user?.isMember}
												onValueChange={async (value) => {
													const isRunning = await checkKernalRunning(["rocket"])
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
							<FormItem className="space-y-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="w-fit text-destructive hover:text-destructive"
									disabled={!user?.isMember}
									onClick={() => setFactorCacheConfirmOpen(true)}
								>
									<Trash2 className="mr-2 size-4" />
									清除因子缓存
								</Button>
							</FormItem>
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
													disabled={!user?.isMember}
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
													<Badge className="font-semibold">
														{"<QMT 路径>"}
													</Badge>
												</FormLabel>
												<div className="flex w-full gap-2">
													<FormControl className="flex-grow">
														<Input
															{...field}
															readOnly
															disabled={!user?.isMember}
															onClick={() =>
																handleFolderSelect.run("qmt_path", "planA")
															}
															placeholder="<QMT 路径>"
														/>
													</FormControl>
													<Button
														size="sm"
														variant="outline"
														disabled={!user?.isMember}
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
														disabled={!user?.isMember}
														className="w-full"
														placeholder="请填写资金账户号..."
													/>
												</FormControl>
												<FormMessage />
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
												disabled={!user?.isMember}
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
											<Badge className="font-semibold">{"<QMT 路径>"}</Badge>
										</FormLabel>
										<div className="flex w-full items-center gap-2">
											<FormControl className="flex-grow">
												<Input
													{...field}
													readOnly
													disabled={!user?.isMember}
													onClick={() =>
														handleFolderSelect.run("qmt_path", "planX")
													}
													placeholder="<QMT 路径>"
												/>
											</FormControl>
											<Button
												size="sm"
												variant="outline"
												className="shrink-0"
												disabled={!user?.isMember}
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
												QMT 数据导出路径，不清楚可以询问客户经理
											</span>
										</FormLabel>
										<div className="flex w-full items-center gap-2">
											<FormControl className="flex-grow">
												<Input
													{...field}
													readOnly
													disabled={!user?.isMember}
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
												disabled={!user?.isMember}
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
									render={({ field }) => (
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
														{field.value
															? "已开启：无需手动将选股内核生成的 QMT 策略复制到 QMT 客户端。"
															: "已关闭：需将选股内核生成的 QMT 策略手动复制到 QMT 客户端中运行。"}
													</p>
												</div>
												<Switch
													id="copy-paste-optimize"
													checked={field.value}
													disabled={!user?.isMember}
													onCheckedChange={field.onChange}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<div className="relative col-span-2 overflow-hidden rounded-xl border border-amber-200/90 bg-amber-50/70 py-3.5 pr-4 pl-5 dark:border-amber-900/70 dark:bg-amber-950/20">
								<div className="absolute inset-y-0 left-0 w-1 bg-amber-400 dark:bg-amber-500/80" />
								<div className="flex items-start gap-3">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-amber-200 dark:bg-amber-900/40 dark:ring-amber-800">
										<TriangleAlert className="size-4 text-amber-500 dark:text-amber-400" />
									</div>
									<div className="min-w-0 space-y-0.5">
										<p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
											请确保 QMT 数据导出路径不为空
										</p>
										<p className="text-[13px] leading-5 text-amber-800/90 dark:text-amber-200/80">
											该文件夹需保存导出的 QMT 数据，若路径为空将导致
											<span className="font-bold text-amber-950 dark:text-amber-50">
												无法正常交易
											</span>
											，请确认无误后再保存。
										</p>
									</div>
								</div>
							</div>
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
