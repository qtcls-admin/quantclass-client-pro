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
	POS_MGMT_STRATEGY_CONFIG,
	SELECT_STOCK_STRATEGY_CONFIG,
} from "@/renderer/constant"
import { useConfig } from "@/renderer/hooks/useConfig"
import { useHandleTimeTask } from "@/renderer/hooks/useHandleTimeTask"
import { useMinDataSchedule } from "@/renderer/hooks/useMinDataSchedule"
import { useToggleAutoRealTrading } from "@/renderer/hooks/useToggleAutoRealTrading"
import { onPowerStatus, unPowerStatusListener } from "@/renderer/ipc/listener"

import {
	isFullscreenAtom,
	isUpdatingAtom,
	loadingAnimeAtom,
} from "@/renderer/store"
import { qmtConnectOkAtom } from "@/renderer/store/rocket-visible"
import {
	accountKeyAtom,
	backtestConfigAtom,
	isAutoLoginAtom,
	planXConfigAtom,
	reTimingAtom,
	realMarketConfigSchemaAtom,
	rebTimeConfigAtom,
} from "@/renderer/store/storage"
import { macAddressAtom, userAtom } from "@/renderer/store/user"
import { useLocalVersions, versionsEffectAtom } from "@/renderer/store/versions"
import type { PosStrategyType, SelectStgType } from "@/renderer/types/strategy"
import {
	type SplitOrderMultiplier,
	parseSplitOrderAmount,
	randomSplitOrderAmount,
} from "@/renderer/utils/split-order-amount"
import { checkPermission } from "@/shared/lib/permission"
import type { AccountsConfigMap } from "@/shared/types/qmt-accounts"
import type { RebTimeConfig } from "@/shared/types/reb-time-config.js"
import { useMount, useUnmount, useUpdateEffect } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import { useAppVersions } from "./useAppVersion"
import { useSettings } from "./useSettings"
import { useUserInfoSync } from "./useUserInfoSync"
const {
	fetchFullscreenState,
	subscribeScheduleStatus,
	removeReportErrorListener,
	unSubscribeSendScheduleStatusListener,
	getMacAddress,
	setAutoLaunch,
	getRebalanceTimeConfig,
	setRebalanceTimeConfig,
	getStoreValue,
	getUserAccount,
	setStoreValue,
} = window.electronAPI

function readPersistedRebTimeConfig(): Record<
	string,
	RebTimeConfig<SelectStgType | PosStrategyType>
> {
	try {
		const raw = localStorage.getItem("rebTimeConfig")
		if (!raw) return {}
		const parsed = JSON.parse(raw) as Record<
			string,
			RebTimeConfig<SelectStgType | PosStrategyType>
		>
		return parsed && typeof parsed === "object" ? parsed : {}
	} catch {
		return {}
	}
}

/**
 * -- 生命周期管理 Hook
 * -- 负责处理应用的初始化、状态管理和清理
 */
export const useLifeCycle = () => {
	// -- 状态管理
	const [config] = useConfig()
	const { refetchLocalVersions } = useLocalVersions()
	const isUpdating = useAtomValue(isUpdatingAtom)
	const isAutoLogin = useAtomValue(isAutoLoginAtom)
	useAtom(versionsEffectAtom)
	useAppVersions()
	useSettings()

	useUserInfoSync()
	const { handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { startMinDataSchedule } = useMinDataSchedule()
	// const { mutateAsync } = useExtraWorkStatus()
	const handleTimeTask = useHandleTimeTask()

	const setUser = useSetAtom(userAtom)

	const setters = {
		setMacAddress: useSetAtom(macAddressAtom),
		setLoading: useSetAtom(loadingAnimeAtom),
		setIsFullscreen: useSetAtom(isFullscreenAtom),
		setAccountKey: useSetAtom(accountKeyAtom),
		setRealMarketConfig: useSetAtom(realMarketConfigSchemaAtom),
		setPlanXConfig: useSetAtom(planXConfigAtom),
		setQmtConnectOk: useSetAtom(qmtConnectOkAtom),
		setBacktestConfig: useSetAtom(backtestConfigAtom),
		setReTiming: useSetAtom(reTimingAtom),
		setRebTimeConfig: useSetAtom(rebTimeConfigAtom),
	}

	// -- 用于保存休眠前的更新状态
	let isUpdatingBeforeSuspend: boolean | null = null
	// useMarketDataManager() // -- 使用实时市场数据管理的自定义 Hook
	/**
	 * -- 初始化定时任务
	 */
	const initScheduleTask = async () => {
		const rebTimeFromStore = await getRebalanceTimeConfig()
		const hasMainRebTime = Object.keys(rebTimeFromStore).length > 0

		if (hasMainRebTime) {
			setters.setRebTimeConfig(
				rebTimeFromStore as Record<
					string,
					RebTimeConfig<SelectStgType | PosStrategyType>
				>,
			)
		} else {
			const rebTimeFromLocal = readPersistedRebTimeConfig()
			await setRebalanceTimeConfig(rebTimeFromLocal)
			setters.setRebTimeConfig(rebTimeFromLocal)
		}

		const realMarketConfig = await getStoreValue("real_market_config", {
			filter_kcb: true,
			filter_cyb: true,
			filter_bj: true,
			qmt_path: "",
			account_id: "",
			qmt_port: "58610",
			qmt_mode: "planX",
			ws_host: "",
			ws_port: "",
			message_robot_url: "",
			performance_mode: "EQUAL",
			date_start: new Date(
				new Date().setFullYear(new Date().getFullYear() - 3),
			),
		})
		const marketCfg = realMarketConfig as {
			split_order_amount?: unknown
			split_order_multiplier?: unknown
		}
		const parsedSplit = parseSplitOrderAmount(marketCfg?.split_order_amount)
		const splitMultiplier: SplitOrderMultiplier =
			marketCfg?.split_order_multiplier === "3" ||
			marketCfg?.split_order_multiplier === 3
				? 3
				: 1
		const splitOrderAmount =
			parsedSplit ?? randomSplitOrderAmount(splitMultiplier)
		if (parsedSplit === undefined) {
			await setStoreValue("real_market_config", {
				...realMarketConfig,
				split_order_amount: splitOrderAmount,
			})
		}
		const accounts = ((await getStoreValue("accounts", {})) ??
			{}) as AccountsConfigMap
		const qmtConnectOk = await getStoreValue("qmt_connect_ok", false)
		setters.setQmtConnectOk(qmtConnectOk === true)

		if (realMarketConfig) {
			const qmtMode = realMarketConfig?.qmt_mode === "planA" ? "planA" : "planX"
			setters.setRealMarketConfig((prevConfig) => ({
				...prevConfig,
				date_start:
					realMarketConfig.date_start &&
					typeof realMarketConfig.date_start === "string"
						? new Date(realMarketConfig.date_start as string)
						: new Date(new Date().setFullYear(new Date().getFullYear() - 3)),
				filter_kcb: realMarketConfig.filter_kcb ? "1" : "0",
				filter_cyb: realMarketConfig?.filter_cyb ? "1" : "0",
				filter_bj: realMarketConfig?.filter_bj ? "1" : "0",
				qmt_path: realMarketConfig?.qmt_path ?? prevConfig.qmt_path ?? "",
				account_id: realMarketConfig?.account_id ?? prevConfig.account_id ?? "",
				qmt_port: realMarketConfig?.qmt_port ?? "58610",
				qmt_mode: qmtMode,
				ws_host: realMarketConfig?.ws_host ?? "",
				ws_port: realMarketConfig?.ws_port ?? "",
				message_robot_url: realMarketConfig?.message_robot_url ?? "",
				split_order_amount: splitOrderAmount,
				split_order_multiplier:
					(realMarketConfig?.split_order_multiplier as "1" | "3" | undefined) ??
					"1",
				performance_mode: (realMarketConfig.performance_mode || "EQUAL") as
					| "EQUAL"
					| "PERFORMANCE"
					| "ECONOMY",
			}))
			setters.setPlanXConfig((prev) => {
				const accountId = prev.account_id ?? ""
				const accountCfg = accountId ? accounts[accountId] : undefined
				return {
					account_id: accountId,
					qmt_path: accountCfg?.qmt_path ?? prev.qmt_path ?? "",
					exported_dir: accountCfg?.exported_dir ?? prev.exported_dir ?? "",
					copy_paste_optimize: accountCfg?.copy_paste_optimize ?? false,
				}
			})
		}
	}

	/**
	 * -- 初始化账户信息
	 */
	const initAccountInfo = async () => {
		const [apiKey, uuid, macAddress] = await Promise.all([
			getStoreValue("settings.api_key", ""),
			getStoreValue("settings.hid", ""),
			getMacAddress(),
		])

		void setters.setMacAddress((prevMacAddress) => {
			if (prevMacAddress !== macAddress) {
				toast.warning(
					"检测到信息变更，虽然右上角有头像，但是请重新登录以确保正常使用",
					{
						duration: 10000,
					},
				)
			}
			return macAddress
		})
		void setters.setAccountKey({
			apiKey: apiKey as string,
			uuid: uuid as string,
		})

		return { apiKey, uuid, macAddress }
	}

	const initBacktestConfig = async (member: boolean) => {
		const configKey = member
			? POS_MGMT_STRATEGY_CONFIG
			: SELECT_STOCK_STRATEGY_CONFIG

		const [initialCash, startDate, endDate, backtestName, reTiming] =
			await Promise.all([
				getStoreValue(`${configKey}.initial_cash`, 100000),
				getStoreValue(`${configKey}.start_date`, ""),
				getStoreValue(`${configKey}.end_date`, ""),
				getStoreValue(`${configKey}.backtest_name`, "默认策略"),
				getStoreValue(`${configKey}.re_timing`, null),
			])

		setters.setBacktestConfig((prev) => ({
			...prev,
			initial_cash: Number(initialCash),
			start_date: startDate
				? new Date(startDate)
				: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
			end_date: endDate ? new Date(endDate) : undefined,
			backtest_name: backtestName as string,
		}))

		// 初始化 re_timing
		setters.setReTiming(reTiming)
	}

	/**
	 * -- 处理电源状态变化
	 */
	const handlePowerStatusChange = (status: string) => {
		if (status === "suspend") {
			isUpdatingBeforeSuspend = isUpdating
			handleTimeTask(true)
		}
		if (status === "resume") {
			handleTimeTask(!isUpdatingBeforeSuspend)
		}
	}

	const initAutoLauncher = async (
		apiKey: string,
		uuid: string,
		isMember: boolean,
	) => {
		if (!apiKey || !uuid) return
		const [isAutoLaunchUpdate, isAutoLaunchRealTrading, isAutoLaunchMinData] =
			await Promise.all([
				getStoreValue("settings.is_auto_launch_update", false),
				getStoreValue("settings.is_auto_launch_real_trading", false),
				getStoreValue("settings.is_auto_launch_min_data", false),
			])

		if (isAutoLaunchUpdate) {
			await handleTimeTask(false, false)
		}

		if (isMember && isAutoLaunchMinData) {
			await startMinDataSchedule(false)
		}

		const shouldStartRocket =
			isAutoLaunchRealTrading &&
			isAutoLaunchUpdate &&
			(isMember ? isAutoLaunchMinData : true)

		if (shouldStartRocket) {
			await handleToggleAutoRocket(true, false, true)
		} else {
			await handleToggleAutoRocket(false, false, true)
		}

		const parts: string[] = []
		if (isAutoLaunchUpdate) parts.push("自动更新历史数据")
		if (isMember && isAutoLaunchMinData) parts.push("自动更新实时数据")
		if (shouldStartRocket) parts.push("自动实盘")
		if (parts.length > 0) {
			toast.success(`已为您开启：${parts.join("、")}`)
		}
	}

	useMount(async () => {
		const [_, { apiKey, uuid }] = await Promise.all([
			initScheduleTask(),
			initAccountInfo(),
		])

		const userAccount = await getUserAccount()
		if (userAccount) {
			setUser(userAccount)
		}
		const isMember = userAccount
			? checkPermission(userAccount.permissions ?? [], "isMember")
			: false

		await initBacktestConfig(isMember)

		onPowerStatus(handlePowerStatusChange)
		subscribeScheduleStatus(
			(_event, status) => status === "done" && refetchLocalVersions(),
		)

		const initialFullscreenState = await fetchFullscreenState()
		setters.setIsFullscreen(initialFullscreenState)

		await initAutoLauncher(apiKey, uuid, isMember)
	})

	// -- 更新效果
	useUpdateEffect(() => {
		setAutoLaunch(isAutoLogin)
	}, [isAutoLogin])

	useUpdateEffect(() => {
		setStoreValue("config", config)
	}, [config])

	// -- 清理
	useUnmount(async () => {
		unSubscribeSendScheduleStatusListener()
		removeReportErrorListener()
		unPowerStatusListener()
	})
}
