/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import type {
	SelectStockMigrationDecision,
	SelectStockMigrationSnapshot,
} from "@/renderer/utils/migrate-select-stock-to-pos-mgmt"

interface PendingSelectStockMigration {
	snapshot: SelectStockMigrationSnapshot
	resolve: (decision: SelectStockMigrationDecision) => void
}

let pending: PendingSelectStockMigration | null = null
const listeners = new Set<() => void>()

function emit() {
	for (const listener of listeners) listener()
}

export function getPendingSelectStockMigration() {
	return pending
}

export function subscribeSelectStockMigration(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function requestSelectStockMigration(
	snapshot: SelectStockMigrationSnapshot,
) {
	return new Promise<SelectStockMigrationDecision>((resolve) => {
		pending = { snapshot, resolve }
		emit()
	})
}

export function settleSelectStockMigration(
	decision: SelectStockMigrationDecision,
) {
	const current = pending
	pending = null
	emit()
	current?.resolve(decision)
}
