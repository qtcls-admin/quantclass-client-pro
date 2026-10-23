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
	StartupCheckDialog,
	type StartupCheckStep,
} from "@/renderer/components/StartupCheckDialog"
import type { StartupCheckFinishedStep } from "@/renderer/components/StartupCheckDialog"
import { qmtConnectOkAtom } from "@/renderer/store/rocket-visible"
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import { startupCheckManualTriggerAtom } from "@/renderer/store/startup-check"
import { userAtom } from "@/renderer/store/user"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const {
	checkStartupNetwork,
	checkStartupQmtConnect,
	checkDataConsistencyAnalyze,
	checkDataConsistencyAlign,
	getStartupCheckScheduleConfig,
	reportStartupCheckResult,
	setStoreValue,
} = window.electronAPI

export interface DataConsistencyCheckResult {
	ok: boolean
	warning?: boolean
	detail?: string
}

// -- 数据一致性自检
export async function runDataConsistencyCheck(): Promise<DataConsistencyCheckResult> {
	try {
		const report = await checkDataConsistencyAnalyze()

		const needAlign = report.alignedDbDiff.onlyDb.length > 0
		if (needAlign) {
			const alignRes = await checkDataConsistencyAlign(report)
			if (!alignRes.ok) {
				return {
					ok: false,
					warning: true,
					detail: alignRes.error ?? "对齐数据库失败",
				}
			}
		}

		const aNames = report.listDiff.aOnly
		const bNames = report.listDiff.bOnly
		const aCount = aNames.length
		const bCount = bNames.length

		if (aCount === 0 && bCount === 0) {
			return {
				ok: true,
				detail: needAlign ? "已对齐数据库" : "三方一致",
			}
		}

		const parts: string[] = []
		if (aCount > 0) {
			parts.push(
				`${aCount} 项本地数据未在白名单中，已加入「历史数据」页的数据回收站，请前往处理`,
			)
		}
		if (bCount > 0) {
			const preview =
				bNames.length <= 5
					? bNames.join("、")
					: `${bNames.slice(0, 5).join("、")} 等 ${bCount} 项`
			parts.push(
				`${preview} 已订阅但本地尚无数据，请前往「历史数据中心」手动执行全量更新`,
			)
		}

		return {
			ok: true,
			warning: true,
			detail: parts.join("；"),
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		return { ok: false, detail: msg }
	}
}

export function StartupCheckLauncher() {
	const manualTrigger = useAtomValue(startupCheckManualTriggerAtom)
	const setQmtConnectOk = useSetAtom(qmtConnectOkAtom)
	const qmtMode = useAtomValue(realMarketConfigSchemaAtom).qmt_mode
	const isPlanA = qmtMode === "planA"
	const { isLoggedIn, user } = useAtomValue(userAtom)
	const [open, setOpen] = useState(false)
	const didAutoLaunchRef = useRef(false)

	useEffect(() => {
		if (didAutoLaunchRef.current) return
		didAutoLaunchRef.current = true
		void getStartupCheckScheduleConfig()
			.then((cfg) => {
				if (cfg.launchEnabled) setOpen(true)
			})
			.catch(() => {})
	}, [])

	useEffect(() => {
		if (manualTrigger > 0) setOpen(true)
	}, [manualTrigger])

	const handleCheckFinished = useCallback(
		(results: StartupCheckFinishedStep[]) => {
			void reportStartupCheckResult({ steps: results })
		},
		[],
	)

	const steps = useMemo<StartupCheckStep[]>(
		() => [
			{
				id: "network",
				title: "网络连接",
				run: async () => {
					const res = await checkStartupNetwork()
					return {
						ok: res.ok,
						detail: res.ok ? undefined : (res.detail ?? res.message),
					}
				},
			},
			{
				id: "login",
				title: "用户登录",
				run: async () => {
					if (isLoggedIn && user) {
						const name = user.nickname || user.uuid
						return { ok: true, detail: `已登录：${name}` }
					}
					return {
						ok: false,
						detail: "当前用户未登录，请点击右上角账户入口完成登录",
					}
				},
			},
			...(isPlanA
				? [
						{
							id: "qmt",
							title: "QMT 连通性",
							run: async () => {
								const res = await checkStartupQmtConnect()
								setQmtConnectOk(res.ok)
								await setStoreValue("qmt_connect_ok", res.ok)
								return {
									ok: res.ok,
									detail: res.detail ?? res.message,
								}
							},
						} satisfies StartupCheckStep,
					]
				: []),
			{
				id: "data-consistency",
				title: "数据一致性",
				run: runDataConsistencyCheck,
			},
		],
		[isLoggedIn, user, setQmtConnectOk, isPlanA],
	)

	return (
		<StartupCheckDialog
			open={open}
			onOpenChange={setOpen}
			steps={steps}
			onFinished={handleCheckFinished}
		/>
	)
}
