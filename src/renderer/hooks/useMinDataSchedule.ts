/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { isMinDataUpdatingAtom, minDataModeAtom } from "@/renderer/store"
import {
	planXConfigAtom,
	realMarketConfigSchemaAtom,
} from "@/renderer/store/storage"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

const { toggleMinDataSchedule } = window.electronAPI

export function useMinDataSchedule() {
	const mode = useAtomValue(minDataModeAtom)
	const realMarketConfig = useAtomValue(realMarketConfigSchemaAtom)
	const planXConfig = useAtomValue(planXConfigAtom)
	const setIsMinDataUpdating = useSetAtom(isMinDataUpdatingAtom)

	const isQmtConfigured = useMemo(() => {
		if (realMarketConfig?.qmt_mode === "planA") {
			return (
				!!realMarketConfig?.account_id?.trim() &&
				!!realMarketConfig?.qmt_path?.trim()
			)
		}
		return (
			!!planXConfig.account_id?.trim() &&
			!!planXConfig.qmt_path?.trim() &&
			!!planXConfig.exported_dir?.trim()
		)
	}, [
		realMarketConfig?.account_id,
		realMarketConfig?.qmt_path,
		realMarketConfig?.qmt_mode,
		planXConfig.account_id,
		planXConfig.qmt_path,
		planXConfig.exported_dir,
	])

	const startMinDataSchedule = useCallback(
		async (showToast = true) => {
			if (!isQmtConfigured) {
				toast.warning(
					realMarketConfig?.qmt_mode === "planA"
						? "QMT 未配置，请先在实盘配置中填写 QMT 账户号和安装路径"
						: "QMT 未配置，请先在实盘配置中填写账户号、安装路径和导出路径",
				)
				return false
			}

			await toggleMinDataSchedule({ isOn: true, mode })
			setIsMinDataUpdating(true)
			if (showToast) {
				toast.dismiss()
				toast.success("自动更新数据已启动")
			}
			return true
		},
		[isQmtConfigured, mode, setIsMinDataUpdating, realMarketConfig?.qmt_mode],
	)

	const stopMinDataSchedule = useCallback(async () => {
		await toggleMinDataSchedule({ isOn: false })
		setIsMinDataUpdating(false)
		toast.dismiss()
		toast.info("自动更新数据已停止")
	}, [setIsMinDataUpdating])

	const syncMinDataSchedule = useCallback(
		async (overrides?: Partial<{ mode: "fast" | "stable" }>) => {
			await toggleMinDataSchedule({
				isOn: true,
				mode: overrides?.mode ?? mode,
			})
		},
		[mode],
	)

	return {
		startMinDataSchedule,
		stopMinDataSchedule,
		syncMinDataSchedule,
	}
}
