/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { useAppVersions } from "@/renderer/hooks/useAppVersion"
import { useRocketVisible } from "@/renderer/hooks/useRocketVisible"
import { userAtom } from "@/renderer/store/user"
import { versionsAtom } from "@/renderer/store/versions"
import { getSelectKernal } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

/**
 * 检查版本是否有更新的hook
 * @returns 版本检查结果和相关状态
 */
export const useVersionCheck = () => {
	const { appVersions, isCheckingAppVersions } = useAppVersions()
	const localVersions = useAtomValue(versionsAtom)
	const { permissions } = useAtomValue(userAtom)
	const rocketVisible = useRocketVisible()
	const selectKernal = getSelectKernal(permissions)
	const selectVersionKey =
		selectKernal === "fusion" ? "fusionVersion" : "aquaVersion"

	// 检查是否有客户端版本更新
	const hasClientUpdate = useMemo(() => {
		const remoteVersion = appVersions?.app?.version
		if (!remoteVersion || !localVersions?.clientVersion) {
			return false
		}
		return remoteVersion !== localVersions.clientVersion
	}, [appVersions?.app?.version, localVersions?.clientVersion])

	// 检查是否有内核版本更新
	const hasKernalUpdates = useMemo(() => {
		const latestRemoteVersions = appVersions?.latest
		if (!latestRemoteVersions || !localVersions) {
			return {
				fuel: false,
				select: false,
				rocket: false,
			}
		}

		const rocketUpdate =
			latestRemoteVersions?.rocket !== localVersions.rocketVersion

		return {
			fuel: latestRemoteVersions?.fuel !== localVersions.fuelVersion,
			select:
				latestRemoteVersions?.[selectKernal] !==
				localVersions[selectVersionKey],
			rocket: rocketVisible && rocketUpdate,
		}
	}, [
		appVersions?.latest,
		localVersions,
		selectKernal,
		selectVersionKey,
		rocketVisible,
	])

	// 检查是否有任何更新
	const hasAnyUpdate = useMemo(() => {
		return hasClientUpdate || Object.values(hasKernalUpdates).some(Boolean)
	}, [hasClientUpdate, hasKernalUpdates])

	// 生成更新消息
	const getUpdateMessage = useMemo(() => {
		if (!hasAnyUpdate) return ""

		const updates: string[] = []

		if (hasClientUpdate) {
			updates.push(
				`客户端: ${localVersions?.clientVersion} → ${appVersions?.app.version}`,
			)
		}

		if (hasKernalUpdates.fuel) {
			updates.push(
				`数据内核: ${localVersions?.fuelVersion} → ${appVersions?.latest?.fuel}`,
			)
		}

		if (hasKernalUpdates.select) {
			updates.push(
				`选股内核: ${localVersions?.[selectVersionKey]} → ${appVersions?.latest?.[selectKernal]}`,
			)
		}

		if (hasKernalUpdates.rocket) {
			updates.push(
				`下单内核: ${localVersions?.rocketVersion} → ${appVersions?.latest?.rocket}`,
			)
		}

		return updates.length > 0 ? updates.join("\n") : ""
	}, [
		hasAnyUpdate,
		hasClientUpdate,
		hasKernalUpdates,
		localVersions,
		appVersions,
		selectKernal,
		selectVersionKey,
	])

	return {
		hasClientUpdate,
		hasKernalUpdates,
		hasAnyUpdate,
		isCheckingVersions: isCheckingAppVersions,
		appVersions,
		localVersions,
		getUpdateMessage,
	}
}
