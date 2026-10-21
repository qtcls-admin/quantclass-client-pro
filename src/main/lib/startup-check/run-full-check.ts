/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { userStore } from "@/main/lib/userStore.js"
import {
	alignFolderAndDb,
	analyzeDataConsistency,
	checkNetworkConnectivity,
	checkQmtConnect,
} from "@/main/lib/startup-check/index.js"
import store from "@/main/store/index.js"
import logger from "@/main/utils/wiston.js"
import type { StartupCheckStepResult } from "@/shared/types/startup-check-schedule.js"

async function runDataConsistencyCheckStep(): Promise<StartupCheckStepResult> {
	try {
		const report = await analyzeDataConsistency()

		const needAlign = report.alignedDbDiff.onlyDb.length > 0
		if (needAlign) {
			try {
				await alignFolderAndDb(report)
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e)
				return {
					title: "数据一致性",
					ok: false,
					warning: true,
					detail: msg,
				}
			}
		}

		const aNames = report.listDiff.aOnly
		const bNames = report.listDiff.bOnly
		const aCount = aNames.length
		const bCount = bNames.length

		if (aCount === 0 && bCount === 0) {
			return {
				title: "数据一致性",
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
			title: "数据一致性",
			ok: true,
			warning: true,
			detail: parts.join("；"),
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		return { title: "数据一致性", ok: false, detail: msg }
	}
}

export async function runFullStartupCheck(): Promise<StartupCheckStepResult[]> {
	const steps: StartupCheckStepResult[] = []

	const network = await checkNetworkConnectivity()
	steps.push({
		title: "网络连接",
		ok: network.ok,
		detail: network.ok ? undefined : (network.detail ?? network.message),
	})

	try {
		const account = await userStore.getUserAccount()
		if (account?.isLoggedIn && account.user) {
			const name = account.user.nickname || account.user.uuid
			steps.push({ title: "用户登录", ok: true, detail: `已登录：${name}` })
		} else {
			steps.push({
				title: "用户登录",
				ok: false,
				detail: "当前用户未登录，请点击右上角账户入口完成登录",
			})
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		steps.push({ title: "用户登录", ok: false, detail: msg })
	}

	const qmtMode = await store.getValue("real_market_config.qmt_mode", "planX")
	if (qmtMode === "planA") {
		const qmt = await checkQmtConnect()
		steps.push({
			title: "QMT 连通性",
			ok: qmt.ok,
			detail: qmt.detail ?? qmt.message,
		})
	}

	steps.push(await runDataConsistencyCheckStep())

	logger.info(
		`[startup-check] 完整自检完成：${steps.filter((s) => s.ok && !s.warning).length}/${steps.length} 通过`,
	)

	return steps
}
