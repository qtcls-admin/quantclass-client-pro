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
import { Input } from "@/renderer/components/ui/input"
import { H2 } from "@/renderer/components/ui/typography"
import { LibraryTable } from "@/renderer/page/library/table"
import { backtestConfigAtom } from "@/renderer/store/storage"
import { userAtom } from "@/renderer/store/user"
import { BASIC_SELECT_STRATEGY_IMPORT_LIMIT } from "@/shared/lib/basic-strategy-import"
import { checkPermission } from "@/shared/lib/permission"
import { useUnmount } from "etc-hooks"
import { useAtom, useAtomValue } from "jotai"
import { Edit } from "lucide-react"
import { useRef, useState } from "react"
import { RatioIntro } from "../FAQ/ratioIntro"

export default function StrategyLibrary() {
	const { setStoreValue } = window.electronAPI
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")

	const tableRef = useRef<{ refresh: () => Promise<void> }>()
	const [isEditing, setIsEditing] = useState(false)

	const [backtestConfig, setBacktestConfig] = useAtom(backtestConfigAtom)

	const backtestName = backtestConfig.backtest_name

	useUnmount(() => {
		setStoreValue("stock_quant.backtest_name", backtestConfig.backtest_name)
	})

	return (
		<div className="h-full flex-1 flex-col space-y-4 md:flex pt-3">
			<div className="w-full">
				<div className="flex items-center gap-2 w-auto">
					{isEditing ? (
						<Input
							autoFocus
							value={backtestName}
							onChange={(e) =>
								setBacktestConfig((p) => ({
									...p,
									backtest_name: e.target.value,
								}))
							}
							className="text-2xl font-semibold tracking-tight h-10 w-auto"
							onBlur={() => setIsEditing(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setIsEditing(false)
								}
							}}
						/>
					) : (
						<>
							<H2>{backtestName}</H2>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								onClick={() => setIsEditing(true)}
							>
								<Edit />
							</Button>
						</>
					)}
				</div>
				<p className="text-muted-foreground">
					导入、查看、编辑各类策略。并设置策略的实盘资金占比
					{!isMember && (
						<span className="text-warning">
							（基础课程最多导入 {BASIC_SELECT_STRATEGY_IMPORT_LIMIT} 个策略）
						</span>
					)}
				</p>
			</div>

			<LibraryTable ref={tableRef} />
			<hr />
			<RatioIntro />
		</div>
	)
}
