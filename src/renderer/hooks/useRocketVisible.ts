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
import { realMarketConfigSchemaAtom } from "@/renderer/store/storage"
import { useAtomValue } from "jotai"

/** 是否展示 Rocket相关 UI：连通性通过且为模式券商特邀 planA */
export function useRocketVisible(): boolean {
	const qmtConnectOk = useAtomValue(qmtConnectOkAtom)
	const qmtMode = useAtomValue(realMarketConfigSchemaAtom).qmt_mode
	return qmtConnectOk && qmtMode === "planA"
}
