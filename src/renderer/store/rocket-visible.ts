/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { atomWithStorage } from "jotai/utils"

/** 是否显示 Rocket（下单内核）；连通性自检通过且模式为 planA 时写入 true，默认 false */
export const rocketVisibleAtom = atomWithStorage<boolean>(
	"rocketVisible",
	false,
	undefined,
	{ getOnInit: true },
)
