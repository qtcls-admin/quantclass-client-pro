import { Badge } from "@/renderer/components/ui/badge"
import { cn } from "@/renderer/lib/utils"
import { rocketVisibleAtom } from "@/renderer/store/rocket-visible"
import { useAtomValue } from "jotai"
import { BadgeInfo, ShieldQuestion } from "lucide-react"
import { Puzzle } from "lucide-react"
import { CalendarSync } from "lucide-react"

export const openLogFolders = (showRocket = true) => {
	const { openUserDirectory, openDataDirectory } = window.electronAPI
	return (
		<>
			<span
				className="cursor-pointer px-1 py-0.5 border bg-muted rounded-md hover:bg-muted-foreground hover:text-muted"
				onClick={() => openUserDirectory("logs")}
			>
				客户端调度日志
			</span>
			，
			<span
				className="cursor-pointer px-1 py-0.5 border bg-muted rounded-md hover:bg-muted-foreground hover:text-muted"
				onClick={() => openDataDirectory(["code", "data", "log"])}
			>
				打开数据日志
			</span>
			，
			<span
				className="cursor-pointer px-1 py-0.5 border bg-muted rounded-md hover:bg-muted-foreground hover:text-muted"
				onClick={() => openDataDirectory(["real_trading", "logs"])}
			>
				打开选股日志
			</span>
			{showRocket ? (
				<>
					，
					<span
						className="cursor-pointer px-1 py-0.5 border bg-muted rounded-md hover:bg-muted-foreground hover:text-muted"
						onClick={() =>
							openDataDirectory(["real_trading", "rocket", "data", "系统日志"])
						}
					>
						打开下单日志
					</span>
				</>
			) : null}
		</>
	)
}

export function AboutPage({ className }: { className?: string }) {
	const rocketVisible = useAtomValue(rocketVisibleAtom)

	return (
		<div className={cn("space-y-3 text-sm leading-loose", className)}>
			<div className="space-y-1">
				<p className="flex items-center gap-1 font-bold text-medium">
					<BadgeInfo size={16} /> 客户端是什么？
				</p>
				<div>
					客户端是一个“自动化调度器”。它不直接做数据更新、选股
					{rocketVisible ? "或下单" : ""}
					，而是帮你生成各个模块需要的配置文件，并按固定频率唤醒对应内核，帮助你把策略从数据到
					{rocketVisible ? "交易" : "选股"}
					的全过程自动化、可管可控。
				</div>
			</div>
			<div className="space-y-1">
				<p className="flex items-center gap-1 font-bold text-medium">
					<Puzzle size={16} /> 模块与职责
				</p>
				<ul className="list-disc pl-4">
					<li>
						<span className="font-bold">Fuel（数据内核）</span>：
						检查并执行数据更新。运行时会在“数据更新日志”产生记录；运行时在Windows
						任务管理器可见进程
						<Badge className="font-mono" variant="outline">
							fuel.exe
						</Badge>
						。
					</li>
					<li>
						<span className="font-bold">Aqua / Fusion（选股内核）</span>
						：基于最新数据检查是否已生成交易计划，并在需要时生成。运行时会在“选股日志”产生记录；运行时在Windows
						任务管理器可见进程
						<Badge className="font-mono" variant="outline">
							aqua.exe
						</Badge>
						或
						<Badge className="font-mono" variant="outline">
							fusion.exe
						</Badge>
						。
					</li>
					{rocketVisible ? (
						<li>
							<span className="font-bold">Rocket（下单内核）</span>
							：仅在交易时段内工作，负责根据计划执行下单。运行时产生“下单相关日志”；运行时在Windows
							任务管理器可见进程
							<Badge className="font-mono" variant="outline">
								rocket.exe
							</Badge>
							。
						</li>
					) : null}
				</ul>
			</div>
			<div className="space-y-1">
				<p className="flex items-center gap-1 font-bold text-medium">
					<CalendarSync size={16} /> 调度与执行逻辑
				</p>
				<ul className="list-disc pl-4">
					<li>
						<span className="font-bold">频率与顺序</span>
						：客户端<u className="text-primary">每分钟</u>依次唤醒{" "}
						{rocketVisible
							? "Rocket → Fuel → Aqua / Fusion"
							: "Fuel → Aqua / Fusion"}
						（单进程串行）。
					</li>
					<li>
						<span className="font-bold">占用检测</span>
						：若上一轮某内核尚未结束，本分钟会自动跳过该内核的唤醒，避免并发与资源争用。
					</li>
					<li>
						<span className="font-bold">边界明确</span>
						：客户端只负责“叫醒与编排”，各内核各自执行、各自记录日志。
					</li>
					{rocketVisible ? (
						<li>
							<span className="font-bold">交易时段</span>
							：Rocket 仅在交易时段内工作，其他时间不唤醒。
						</li>
					) : null}
					<li>
						<span className="font-bold">运行逻辑</span>
						：数据内核更新数据，选股内核基于最新数据生成计划
						{rocketVisible ? "，下单内核按时加载并执行计划" : ""}。
					</li>
				</ul>
			</div>
			<div className="space-y-1">
				<p className="flex items-center gap-1 font-bold text-medium">
					<CalendarSync size={16} /> 可视化与排查
				</p>
				<ul className="list-disc pl-4">
					<li>
						<span className="font-bold">日志可见</span>
						：数据更新请看“数据更新日志”，选股请看“选股日志”
						{rocketVisible ? "，下单相关请看对应日志" : ""}。
					</li>
					<li>
						<span className="font-bold">进程可见</span>
						：在 Windows 任务管理器可看到{" "}
						<Badge className="font-mono" variant="outline">
							fuel.exe
						</Badge>{" "}
						或{" "}
						<Badge className="font-mono" variant="outline">
							aqua.exe
						</Badge>
						{" / "}
						<Badge className="font-mono" variant="outline">
							fusion.exe
						</Badge>
						{rocketVisible ? (
							<>
								{" "}
								或{" "}
								<Badge className="font-mono" variant="outline">
									rocket.exe
								</Badge>
							</>
						) : null}{" "}
						，用于确认各内核运行状态。
					</li>
					<li>
						<span className="font-bold">状态栏</span>
						：在状态栏可以看到各内核的运行状态。⚪ 表示未启用，🟡
						启动但是未执行，🟢 表示正在运行。
					</li>
					<li>
						<span className="font-bold">日志文件夹</span>：{" "}
						{openLogFolders(rocketVisible)}。
					</li>
				</ul>
			</div>
			<div className="space-y-1">
				<p className="flex items-center gap-1 font-bold text-medium">
					<ShieldQuestion size={16} /> 使用前确认
				</p>
				<ul className="list-disc pl-4">
					<li>
						<span className="font-bold">自动实盘前提</span>：
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							A.客户端正确的配置
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							B.数据及时的更新
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							C.策略正常选股
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							D.下单模块准确执行
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							E.QMT正常配置
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							F.QMT客户端正常运行
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							G.电脑算力和网络正常
						</span>
						，
						<span className="px-1 py-0.5 border bg-muted rounded-md">
							H.及时启动客户端
						</span>
						。
					</li>
					<li>
						<span className="font-bold">问题处理</span>
						：如果遇到问题，及时联系助教帮忙，不要随便修改中间结果，造成二次问题。
					</li>
				</ul>
			</div>
		</div>
	)
}

export const ABOUT_CLIENT_VER = "about_client_v2025-09-16"
