/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { qmtConnectOkAtom } from "@/renderer/store/rocket-visible"
import { useMount } from "etc-hooks"
import { useSetAtom } from "jotai"

const { getStoreValue } = window.electronAPI

/** 从 Electron store 读取 QMT 连通性 */
export async function fetchQmtConnectOkFromStore(): Promise<boolean> {
	const qmtConnectOk = await getStoreValue("qmt_connect_ok", false)
	return qmtConnectOk === true
}

/** 独立日志窗口 mount 时从 Electron store 灌入 `useRocketVisible` 依赖的 atom */
export function useTerminalStoreHydration() {
	const setQmtConnectOk = useSetAtom(qmtConnectOkAtom)

	useMount(async () => {
		setQmtConnectOk(await fetchQmtConnectOkFromStore())
	})
}
