/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_XBX_ENV: string
	readonly VITE_BASE_URL: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
