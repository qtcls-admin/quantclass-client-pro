/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { CheckIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { useTheme } from "next-themes"
import * as React from "react"
import { useEffect } from "react"

import { MemberPromoDialog } from "@/renderer/components/member-promo"
import { useConfig } from "@/renderer/hooks/useConfig"
import { cn } from "@/renderer/lib/utils"
import "@renderer/mdx.css"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"

import {
	memberPromoBorderClassName,
	memberPromoGradientClassName,
	memberPromoTextClassName,
} from "@/renderer/components/member-promo/theme"
import { ThemeWrapper } from "@/renderer/components/theme-wrapper"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/renderer/components/ui/alert-dialog"
import { Button } from "@/renderer/components/ui/button"
import { Label } from "@/renderer/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/renderer/components/ui/popover"
import { Skeleton } from "@/renderer/components/ui/skeleton"
import { UndoIcon } from "@/renderer/icons/UndoIcon"
import {
	type BaseColor,
	baseColors,
} from "@/renderer/registry/registry-base-color"
import { useUpdateEffect } from "etc-hooks"
import { Palette, Sparkles } from "lucide-react"

// -- 添加视图过渡动画样式
const viewTransitionStyle = `
::view-transition-new(root) {
  mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="white"/></svg>')
    center / 0 no-repeat;
  animation: scale 1s;
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  z-index: -1;
}
.dark::view-transition-new(root) {
  animation: scale 1s;
}

@keyframes scale {
  to {
    mask-size: 200vmax;
  }
}`
const { setStoreValue } = window.electronAPI

// -- 注入动画样式
function injectViewTransitionStyle() {
	const style = document.createElement("style")
	style.textContent = viewTransitionStyle
	document.head.appendChild(style)
}

export function ThemeCustomizer() {
	const [open, setOpen] = React.useState(false)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"relative w-12 border-0 bg-transparent rounded-[10px] cursor-pointer transition-colors",
						"text-muted-foreground hover:bg-accent/50 hover:text-foreground",
						open && "text-foreground bg-accent/60",
						"py-2.5 flex items-center justify-center",
					)}
					aria-label="主题设置"
				>
					<Palette className="size-[21px]" strokeWidth={1.7} />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				side="right"
				sideOffset={8}
				className="z-40 w-[340px] rounded-[12px] bg-white p-6 dark:bg-zinc-950"
			>
				<Customizer />
			</PopoverContent>
		</Popover>
	)
}

export function Customizer() {
	const [mounted, setMounted] = React.useState(false)
	const { setTheme: setMode, resolvedTheme: mode } = useTheme()
	const [config, setConfig] = useConfig()
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [promoOpen, setPromoOpen] = React.useState(false)
	const [showRestartDialog, setShowRestartDialog] = React.useState(false)
	const [pendingTheme, setPendingTheme] =
		React.useState<BaseColor["name"]>("zinc")

	React.useEffect(() => {
		setMounted(true)
	}, [])

	useUpdateEffect(() => {
		setStoreValue("ui_theme", mode)
	}, [mode])

	// -- 初始化注入动画样式
	useEffect(() => {
		injectViewTransitionStyle()
	}, [])

	// -- 添加带动画的主题切换函数
	const handleThemeChange = (theme: string) => {
		if ((document as any).startViewTransition) {
			;(document as any).startViewTransition(() => {
				setMode(theme)
			})
		} else {
			setMode(theme)
		}
	}

	// -- 处理主题色切换
	const handleThemeColorChange = (themeName: BaseColor["name"]) => {
		if (!isMember) {
			setPromoOpen(true)
			return
		}

		setPendingTheme(themeName)
		setShowRestartDialog(true)
	}

	// -- 立即重启应用
	const handleRestartNow = () => {
		setConfig({
			...config,
			theme: pendingTheme,
		})
		setShowRestartDialog(false)
		window.location.reload()
	}

	// -- 稍后重启
	const handleRestartLater = () => {
		setConfig({
			...config,
			theme: pendingTheme,
		})
		setShowRestartDialog(false)
	}

	return (
		<>
			<ThemeWrapper className="flex flex-col space-y-4 md:space-y-6">
				<div className="flex items-start pt-4 md:pt-0">
					<div className="space-y-1 pr-2">
						<div className="font-semibold leading-none tracking-tight">
							自定义
						</div>
						<div className="text-xs text-muted-foreground">
							设置一个自己的风格和颜色
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="ml-auto rounded-[0.5rem]"
						onClick={() => {
							setConfig({
								...config,
								theme: "zinc",
								radius: 0.5,
							})
							window.location.reload()
						}}
					>
						<UndoIcon />
						<span className="sr-only">Reset</span>
					</Button>
				</div>
				<div className="flex flex-1 flex-col space-y-4 md:space-y-6">
					<div className="space-y-1.5">
						<Label className="text-xs">颜色模式</Label>
						<div className="grid grid-cols-3 gap-2">
							{mounted ? (
								<>
									<Button
										variant={"outline"}
										size="sm"
										onClick={() => handleThemeChange("light")}
										className={cn(
											mode === "light" && "border-2 border-primary",
										)}
									>
										<SunIcon className="mr-1 -translate-x-1" />
										浅色
									</Button>
									<Button
										variant={"outline"}
										size="sm"
										onClick={() => handleThemeChange("dark")}
										className={cn(mode === "dark" && "border-2 border-primary")}
									>
										<MoonIcon className="mr-1 -translate-x-1" />
										深色
									</Button>
								</>
							) : (
								<>
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
								</>
							)}
						</div>
					</div>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2">
							<Label className="text-xs">主题色</Label>
							{!isMember && (
								<span
									className={cn(
										"inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
										memberPromoTextClassName,
										memberPromoGradientClassName,
										memberPromoBorderClassName,
									)}
								>
									<Sparkles
										className="size-2.5 text-violet-500"
										strokeWidth={1.75}
									/>
									分享会专属功能
								</span>
							)}
						</div>
						<div className="grid grid-cols-3 gap-2">
							{baseColors.map((theme) => {
								const isActive = config.theme === theme.name

								return mounted ? (
									<Button
										variant={"outline"}
										size="sm"
										key={theme.name}
										onClick={() => handleThemeColorChange(theme.name)}
										className={cn(
											"justify-start",
											isActive && "border-2 border-primary",
										)}
										style={
											{
												"--theme-primary": `hsl(${
													theme?.activeColor[mode === "dark" ? "dark" : "light"]
												})`,
											} as React.CSSProperties
										}
									>
										<span
											className={cn(
												"mr-1 flex h-5 w-5 shrink-0 -translate-x-1 items-center justify-center rounded-full bg-[--theme-primary]",
											)}
										>
											{isActive && <CheckIcon className="h-4 w-4 text-white" />}
										</span>
										{theme.label}
									</Button>
								) : (
									<Skeleton className="h-8 w-full" key={theme.name} />
								)
							})}
						</div>
					</div>
					{/* <div className="space-y-1.5">
						<Label className="text-xs">Radius</Label>
						<div className="grid grid-cols-5 gap-2">
							{["0", "0.3", "0.5", "0.75", "1.0"].map((value) => {
								return (
									<Button
										variant={"outline"}
										size="sm"
										key={value}
										onClick={() => {
											setConfig({
												...config,
												radius: parseFloat(value),
											})
										}}
										className={cn(
											config.radius === parseFloat(value) &&
												"border-2 border-primary",
										)}
									>
										{value}
									</Button>
								)
							})}
						</div>
					</div> */}
				</div>
			</ThemeWrapper>

			<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />

			{/* 重启提示弹窗 */}
			<AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>主题色切换提示</AlertDialogTitle>
						<AlertDialogDescription>
							主题色更改需要重启应用才能完全生效。
							<br />
							您希望立即重启应用，还是稍后手动重启？
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleRestartLater}>
							稍后重启
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleRestartNow}>
							立即重启
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
