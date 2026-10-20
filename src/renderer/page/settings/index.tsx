/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { KernalVersion } from "@/renderer/components/kernal-version"
import { PerformanceModeSelectTabs } from "@/renderer/components/select-tabs"
import { AnimatedRainbowCard } from "@/renderer/components/ui/animated-rainbow-card"
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/renderer/components/ui/avatar"
import { Badge } from "@/renderer/components/ui/badge"
import { Button } from "@/renderer/components/ui/button"
import { Label } from "@/renderer/components/ui/label"
import { Separator } from "@/renderer/components/ui/separator"
import { Switch } from "@/renderer/components/ui/switch"
import { isWindows } from "@/renderer/constant"
import { useAlertDialog } from "@/renderer/context/alert-dialog"
import { useHandleTimeTask, useToggleAutoRealTrading } from "@/renderer/hooks"
import { useAppVersions } from "@/renderer/hooks/useAppVersion"
import { useInvokeUpdateKernal } from "@/renderer/hooks/useInvokeUpdateKernal"
import { usePermissionCheck } from "@/renderer/hooks/usePermissionCheck"
import { useRealMarketConfig } from "@/renderer/hooks/useRealMarketConfig"
import { useSettings } from "@/renderer/hooks/useSettings"
import { useVersionCheck } from "@/renderer/hooks/useVersionCheck"
import { cn } from "@/renderer/lib/utils"
import Contributors from "@/renderer/page/settings/contributors"
import { rocketVisibleAtom } from "@/renderer/store/rocket-visible"
import { isAutoLoginAtom, versionListAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { useLocalVersions, versionsAtom } from "@/renderer/store/versions"
import type { SettingsType } from "@/renderer/types"
import type { KernalType } from "@/shared/types"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
	Activity,
	Blocks,
	ChevronDown,
	ChevronUp,
	CircleArrowUp,
	DatabaseZap,
	FolderCode,
	Gift,
	Minimize,
	Power,
	RefreshCw,
	Rocket,
	Rss,
	SquareFunction,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import Img from "../../../../build/icon.ico"
import { AboutPage } from "./about"

export default function SettingsPage() {
	const [showContributors, setShowContributors] = useState(false)
	const { isMember } = useAtomValue(userAtom)
	const rocketVisible = useAtomValue(rocketVisibleAtom)
	const { checkWithToast } = usePermissionCheck()
	const [isAutoLogin, setIsAutoLogin] = useAtom(isAutoLoginAtom)

	const { VITE_XBX_ENV } = import.meta.env

	// 实盘交易权限检查
	const canRealTrading =
		VITE_XBX_ENV === "development" ||
		(isMember && isWindows && VITE_XBX_ENV === "production")
	const version = useAtomValue(versionsAtom)
	const setVersionList = useSetAtom(versionListAtom)
	const { setAutoLaunch, openDataDirectory, killAllKernals, openUrl } =
		window.electronAPI
	const handleTimeTask = useHandleTimeTask() // 数据任务控制
	const { isAutoRocket, handleToggleAutoRocket } = useToggleAutoRealTrading() // 自动交易控制

	const { settings, updateSettings } = useSettings()
	const { realMarketConfig, setPerformanceMode } = useRealMarketConfig()
	const isAutoLaunchRealTrading = useMemo(() => {
		return settings.is_auto_launch_real_trading
	}, [settings.is_auto_launch_real_trading])

	const isAutoLaunchUpdate = useMemo(() => {
		return settings.is_auto_launch_update
	}, [settings.is_auto_launch_update])

	const isAutoLaunchMinData = useMemo(() => {
		return settings.is_auto_launch_min_data
	}, [settings.is_auto_launch_min_data])

	const handleSetIsAutoLaunchUpdate = (value: boolean) => {
		const updates: Partial<SettingsType> = { is_auto_launch_update: value }
		if (!value) {
			updates.is_auto_launch_real_trading = false
		}
		updateSettings(updates)
		toast.dismiss()
		toast.success(value ? "自动更新历史数据已开启" : "自动更新历史数据已关闭")
	}

	const handleSetIsAutoLaunchMinData = (value: boolean) => {
		const updates: Partial<SettingsType> = { is_auto_launch_min_data: value }
		if (!value) {
			updates.is_auto_launch_real_trading = false
		}
		updateSettings(updates)
		toast.dismiss()
		toast.success(value ? "自动更新实时数据已开启" : "自动更新实时数据已关闭")
	}

	const handleSetIsAutoLaunchRealTrading = (value: boolean) => {
		if (!checkWithToast({ requireMember: true, onlyIn2025: true }).isValid)
			return

		const updates: Partial<SettingsType> = {
			is_auto_launch_real_trading: value,
		}
		if (value) {
			updates.is_auto_launch_update = true
			updates.is_auto_launch_min_data = true
		}
		updateSettings(updates)
		toast.dismiss()
		toast.success(value ? "实盘自动启动已开启" : "实盘自动启动已关闭")
	}

	const handleSetUserChoice = async (value: boolean) => {
		updateSettings({ user_choice: value })
		toast.dismiss()
		toast.success(
			value ? "退出时最小化到系统托盘已开启" : "退出时最小化到系统托盘已关闭",
		)
	}

	const handleSetIsAutoLogin = async (value: boolean) => {
		await setAutoLaunch(value)
		setIsAutoLogin(value)
		toast.dismiss()
		toast.success(value ? "开机自启动已开启" : "开机自启动已关闭")
	}

	const { appVersions, isCheckingAppVersions, refetchAppVersions } =
		useAppVersions()

	const { refetchLocalVersions, isLoadingLocalVersions } = useLocalVersions()

	const useAlert = useAlertDialog()
	const invokeUpdateKernal = useInvokeUpdateKernal() // 更新内核
	const { getUpdateMessage, hasAnyUpdate, hasClientUpdate } = useVersionCheck()

	const handleUpdateKernals = async () => {
		useAlert.open({
			title: "一键更新内核",
			content: (
				<div className="space-y-3 leading-relaxed">
					<AnimatedRainbowCard
						icon="✨"
						title="内核更新提示"
						description="即将为您更新所有内核到最新版本，请仔细阅读以下注意事项"
					/>
					<Separator />
					<p>
						🛑 更新前，会自动停止自动数据更新和实盘功能。在完成更新后，需要
						<span className="text-warning">手动开启</span>。
					</p>
					<p>
						🔥 更新内核的时候，会强制退出运行中的
						<span className="text-danger">所有内核</span>
						进程，建议手动停止数据更新以及实盘功能后更新。
					</p>
					<p>⏩ 内核更新立即生效，建议盘后更新较为稳妥。</p>
					<p>💬 如果遇到问题，可以私信林奇或者夏普助教帮助。</p>
				</div>
			),
			okText: "立即更新",
			okDelay: 10,
			onOk: async () => {
				await handleTimeTask(true, false)
				if (isAutoRocket) {
					await handleToggleAutoRocket(false, false)
				}
				// -- 更新前重新请求版本
				await refetchAppVersions()

				// -- 更新前强制杀死所有内核
				await killAllKernals(true)

				// -- 更新内核
				const kernalsToUpdate: KernalType[] = rocketVisible
					? ["fuel", "fusion", "rocket"]
					: ["fuel", "fusion"]
				for (const kernal of kernalsToUpdate) {
					await invokeUpdateKernal(kernal)
				}
				await refetchLocalVersions()
				toast.success("内核更新完成", {
					duration: 4 * 1000,
				})
			},
		})
	}

	return (
		<div className="space-y-4 py-4">
			{hasAnyUpdate && (
				<AnimatedRainbowCard
					icon={<CircleArrowUp size={22} />}
					title="有可用更新"
					description={getUpdateMessage}
				/>
			)}
			<div className="space-y-4">
				<div className="flex items-center gap-3">
					<Avatar className="border bg-white dark:border-white ">
						<AvatarImage src={Img} alt="@shadcn" />
						<AvatarFallback>QC</AvatarFallback>
					</Avatar>

					<div className="space-y-1">
						<div className="font-semibold">量化小讲堂</div>
						<div className="text-sm flex items-center gap-1">
							<Badge className="font-mono h-5">v{version.clientVersion}</Badge>
							<span>｜</span>
							<button
								type="button"
								className="cursor-pointer text-muted-foreground hover:underline"
								onClick={() => {
									setVersionList([])
								}}
							>
								客户端更新日志
							</button>
							{hasClientUpdate && (
								<>
									<span>｜</span>
									<button
										type="button"
										className="cursor-pointer text-blue-500 dark:text-blue-400 hover:underline"
										onClick={() => {
											openUrl(appVersions?.app?.download as string)
										}}
									>
										下载新版
									</button>
								</>
							)}
						</div>
					</div>
				</div>

				<AboutPage className="border p-2 rounded-lg max-h-72 overflow-y-auto shadow-inner bg-neutral-50/60 dark:bg-neutral-900" />
				<div
					className={cn(
						"grid",
						rocketVisible ? "grid-cols-3" : "grid-cols-2",
					)}
				>
					<KernalVersion
						name="fuel"
						title="数据内核"
						Icon={DatabaseZap}
						versionKey="fuelVersion"
						appVersions={appVersions}
					/>

					<KernalVersion
						name="fusion"
						title="选股内核"
						Icon={SquareFunction}
						versionKey="fusionVersion"
						appVersions={appVersions}
					/>

					{rocketVisible ? (
						<KernalVersion
							name="rocket"
							title="下单内核"
							Icon={Blocks}
							versionKey="rocketVersion"
							appVersions={appVersions}
						/>
					) : null}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={
						!isMember || isCheckingAppVersions || isLoadingLocalVersions
					}
					onClick={async () => {
						await refetchAppVersions()
						await refetchLocalVersions()
						toast.success("版本检查更新完成", {
							duration: 4 * 1000,
						})
					}}
				>
					<RefreshCw
						className={cn(
							"size-4 mr-2",
							(isCheckingAppVersions || isLoadingLocalVersions) &&
								"animate-spin",
						)}
					/>
					检查更新
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={!isMember}
					onClick={async () => {
						if (!isMember) {
							toast.dismiss()
							toast.error("本功能为分享会同学使用")
							return
						}
						await handleUpdateKernals()
					}}
				>
					<CircleArrowUp className="size-4 mr-2" />
					一键更新内核
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={async () => {
						await openDataDirectory("code")
					}}
				>
					<FolderCode className="size-4 mr-2" />
					打开内核文件夹
				</Button>
			</div>

			<div className="space-y-1">
				<Label className="font-medium text-sm hover:cursor-pointer flex items-center gap-1">
					<CircleArrowUp className="size-4" />
					更新说明
				</Label>
				<p className="text-xs text-muted-foreground">
					客户端会自动检查软件和内核更新，但
					<span className="text-success font-bold">不会自动更新</span>
					。更新后遇到问题，也可以在上方回退任意适配的历史版本。
				</p>
			</div>

			<Separator />

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label className="font-medium text-sm hover:cursor-pointer flex items-center gap-1">
							<DatabaseZap className="size-4" />
							数据更新性能
						</Label>
						<p className="text-xs text-muted-foreground">
							数据更新性能，性能越高，数据更新速度越快，但会占用更多性能。
						</p>
					</div>
					<div className={cn(!isMember && "pointer-events-none opacity-50")}>
						<PerformanceModeSelectTabs
							name="数据更新"
							defaultValue={settings.performance_mode || "EQUAL"}
							onValueChange={(value) => {
								if (!isMember) return
								updateSettings({ performance_mode: value })
							}}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label className="font-medium text-sm hover:cursor-pointer flex items-center gap-1">
							<SquareFunction className="size-4" />
							选股性能模式
						</Label>
						<p className="text-xs text-muted-foreground">
							选股性能模式，性能越高，选股速度越快，但会占用更多性能。
						</p>
					</div>
					<div className={cn(!isMember && "pointer-events-none opacity-50")}>
						<PerformanceModeSelectTabs
							name="选股"
							defaultValue={realMarketConfig.performance_mode || "EQUAL"}
							onValueChange={(value) => {
								if (!isMember) return
								setPerformanceMode(value)
							}}
						/>
					</div>
				</div>
			</div>

			<Separator />

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label
							htmlFor="startup"
							className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
						>
							<Power className="size-4" />
							开机打开客户端
						</Label>
						<p className="text-xs text-muted-foreground">
							电脑开机时自动打开量化小讲堂客户端。
						</p>
					</div>
					<Switch
						id="startup"
						checked={isAutoLogin}
						onCheckedChange={handleSetIsAutoLogin}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label
							htmlFor="is_auto_launch_update"
							className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
						>
							<Rss className="size-4" />
							自动更新历史数据
						</Label>
						<p className="text-xs text-muted-foreground">
							应用启动时开启自动更新历史数据。
						</p>
					</div>
					<Switch
						id="is_auto_launch_update"
						checked={isAutoLaunchUpdate}
						disabled={!isMember}
						onCheckedChange={handleSetIsAutoLaunchUpdate}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label
							htmlFor="is_auto_launch_min_data"
							className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
						>
							<Activity className="size-4" />
							自动更新实时数据
						</Label>
						<p className="text-xs text-muted-foreground">
							应用启动时开启自动更新实时数据。
						</p>
					</div>
					<Switch
						id="is_auto_launch_min_data"
						checked={isAutoLaunchMinData}
						disabled={!isMember}
						onCheckedChange={handleSetIsAutoLaunchMinData}
					/>
				</div>

				{canRealTrading && (
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label
								htmlFor="is_auto_launch_real_trading"
								className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
							>
								<Rocket className="size-4" />
								启动自动实盘
							</Label>
							<p className="text-xs text-muted-foreground">
								应用启动时开启自动实盘（开启后默认会开启自动更新历史数据和实时数据）。
							</p>
						</div>
						<Switch
							id="is_auto_launch_real_trading"
							checked={isAutoLaunchRealTrading}
							disabled={!isMember}
							onCheckedChange={handleSetIsAutoLaunchRealTrading}
						/>
					</div>
				)}

				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Label
							htmlFor="user_choice"
							className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
						>
							<Minimize className="size-4" />
							退出时最小化
						</Label>
						<p className="text-xs text-muted-foreground">
							退出时最小化到系统托盘。
						</p>
					</div>

					<Switch
						id="user_choice"
						checked={settings.user_choice}
						onCheckedChange={handleSetUserChoice}
					/>
				</div>
			</div>

			<Separator />

			<div>
				<div className="flex items-center justify-between">
					<Label
						htmlFor="show_contributors"
						className="font-medium text-sm hover:cursor-pointer flex items-center gap-1"
						onClick={() => setShowContributors(!showContributors)}
					>
						<Gift className="size-4" />
						特别鸣谢贡献者
					</Label>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => setShowContributors(!showContributors)}
					>
						{showContributors ? (
							<ChevronUp className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
					</Button>
				</div>

				{showContributors && <Contributors />}
			</div>
		</div>
	)
}
