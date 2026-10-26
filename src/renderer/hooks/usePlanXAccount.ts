/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { accountsAtom } from "@/renderer/store/storage"
import { getPlanXAccountView } from "@/shared/types/qmt-accounts"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

/** Plan X 账户视图；多账户阶段改为 activeId + accounts[id] */
export function usePlanXAccount() {
	const accounts = useAtomValue(accountsAtom)
	return useMemo(() => getPlanXAccountView(accounts), [accounts])
}
