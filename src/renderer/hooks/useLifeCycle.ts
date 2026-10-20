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
	isWindows,
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
import {
	accountKeyAtom,
	backtestConfigAtom,
	isAutoLoginAtom,
	libraryTypeAtom,
	reTimingAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { macAddressAtom } from "@/renderer/store/user"
import { useLocalVersions, versionsEffectAtom } from "@/renderer/store/versions"
import { useMount, useUnmount, useUpdateEffect } from "etc-hooks"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import { useAppVersions } from "./useAppVersion"
import { useFusionManager } from "./useFusionManager"
import { useSettings } from "./useSettings"
import { useStrategyManager } from "./useStrategyManager"
import { useUserInfoSync } from "./useUserInfoSync"
const {
	fetchFullscreenState,
	subscribeScheduleStatus,
	removeReportErrorListener,
	unSubscribeSendScheduleStatusListener,
	// checkDBFile,
	getMacAddress,
	setAutoLaunch,
	getStoreValue,
	setStoreValue,
	// deleteStoreValue,
} = window.electronAPI

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
	useAtom(versionsEffectAtom) // -- 监听版本更新
	useAppVersions() // -- 检查远程版本
	useSettings() // -- 监听设置更新

	// -- 自定义 Hooks
	useUserInfoSync() // -- 同步用户信息，一分钟轮询一次
	const { syncSelectStgList } = useStrategyManager()
	const { syncFusion } = useFusionManager()
	const { handleToggleAutoRocket } = useToggleAutoRealTrading()
	const { startMinDataSchedule } = useMinDataSchedule()
	// const { mutateAsync } = useExtraWorkStatus()
	const handleTimeTask = useHandleTimeTask()

	// -- Setters
	const setters = {
		setLibraryType: useSetAtom(libraryTypeAtom),
		// setExtraWorkStatus: useSetAtom(extraWorkStatusAtom),
		setMacAddress: useSetAtom(macAddressAtom),
		setLoading: useSetAtom(loadingAnimeAtom),
		setIsFullscreen: useSetAtom(isFullscreenAtom),
		setAccountKey: useSetAtom(accountKeyAtom),
		setRealMarketConfig: useSetAtom(realMarketConfigSchemaAtom),
		setBacktestConfig: useSetAtom(backtestConfigAtom),
		setReTiming: useSetAtom(reTimingAtom),
	}

	// -- 用于保存休眠前的更新状态
	let isUpdatingBeforeSuspend: boolean | null = null
	// useMarketDataManager() // -- 使用实时市场数据管理的自定义 Hook
	/**
	 * -- 初始化定时任务
	 */
	const initScheduleTask = async () => {
		const realMarketConfig = await getStoreValue("real_market_config", {
			filter_kcb: true,
			filter_cyb: true,
			filter_bj: true,
			qmt_path: "",
			account_id: "",
			qmt_port: "58610",
			qmt_mode: "qmt",
			ws_host: "",
			ws_port: "",
			message_robot_url: "",
			performance_mode: "EQUAL",
			date_start: new Date(
				new Date().setFullYear(new Date().getFullYear() - 3),
			),
		})

		if (realMarketConfig && isWindows) {
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
				qmt_path: realMarketConfig?.qmt_path ?? "",
				account_id: realMarketConfig?.account_id ?? "",
				qmt_port: realMarketConfig?.qmt_port ?? "58610",
				qmt_mode: realMarketConfig?.qmt_mode ?? "qmt",
				ws_host: realMarketConfig?.ws_host ?? "",
				ws_port: realMarketConfig?.ws_port ?? "",
				message_robot_url: realMarketConfig?.message_robot_url ?? "",
				performance_mode: (realMarketConfig.performance_mode || "EQUAL") as
					| "EQUAL"
					| "PERFORMANCE"
					| "ECONOMY",
			}))
		}
	}

	/**
	 * -- 初始化账户信息
	 */
	const initAccountInfo = async () => {
		const [apiKey, uuid, libraryType, macAddress] = await Promise.all([
			getStoreValue("settings.api_key", ""),
			getStoreValue("settings.hid", ""),
			getStoreValue("settings.libraryType", "pos"),
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

		setters.setLibraryType(libraryType === "pos" ? "pos" : "select") // -- 设置策略库类型

		return { apiKey, uuid, libraryType, macAddress }
	}

	/**
	 * -- 初始化回测配置
	 */
	const initBacktestConfig = async (libraryType: string) => {
		const configKey =
			libraryType === "pos"
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

	const initAutoLauncher = async (apiKey: string, uuid: string) => {
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

		if (isAutoLaunchMinData) {
			await startMinDataSchedule(false)
		}

		const shouldStartRocket =
			isAutoLaunchRealTrading && isAutoLaunchUpdate && isAutoLaunchMinData

		if (shouldStartRocket) {
			await handleToggleAutoRocket(true, false, true)
		} else {
			await handleToggleAutoRocket(false, false, true)
		}

		const parts: string[] = []
		if (isAutoLaunchUpdate) parts.push("自动更新历史数据")
		if (isAutoLaunchMinData) parts.push("自动更新实时数据")
		if (shouldStartRocket) parts.push("自动实盘")
		if (parts.length > 0) {
			toast.success(`已为您开启：${parts.join("、")}`)
		}
	}

	// -- 生命周期钩子
	useMount(async () => {
		// versionCheck.start()
		const [_, { apiKey, uuid, libraryType }] = await Promise.all([
			initScheduleTask(),
			initAccountInfo(),
		])

		// -- 初始化回测配置
		await initBacktestConfig(libraryType)

		// -- 初始化监听器
		onPowerStatus(handlePowerStatusChange)
		subscribeScheduleStatus(
			(_event, status) => status === "done" && refetchLocalVersions(),
		)

		// -- 初始化其他状态
		const initialFullscreenState = await fetchFullscreenState()
		setters.setIsFullscreen(initialFullscreenState)

		// -- 清理实时市场数据，这个虽然useMarket的过程中会清理，但是这里是为了保险起见，初始化时再清理一次
		// await cleanMarketData()
		const syncActiveStrategyLibrary =
			libraryType === "pos" ? syncFusion : syncSelectStgList

		await Promise.all([
			syncActiveStrategyLibrary(),
			initAutoLauncher(apiKey, uuid),
		])
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
