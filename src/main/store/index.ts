/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import Store from "electron-store"

const store = new Store()
// -- 旧 rocket 读取策略配置
export const rStore = new Store({ name: "real_market_25" })

const realMarketOld = path.join(app.getPath("userData"), "real_market.json")
if (fs.existsSync(realMarketOld)) {
	fs.unlinkSync(realMarketOld)
}

export const CONFIG_PATH = path.join(app.getPath("userData"), "config.json")
export const EXEC_FUEL_PATH = path.join(app.getPath("userData"), "fuel")

const setValue = (key: string, value: any) => {
	store.set(key, value)
}

const getValue = async <T>(key: string, defaultValue?: T): Promise<T> =>
	((await store.get(key)) as T) || (defaultValue as T)

const deleteValue = (key: string) => {
	store.delete(key)
}

const getSettings = async () => await getValue("settings", {})

const getSetting = async <T>(
	key: string,
	defaultValue: T = "" as T,
): Promise<T> => {
	const settings = (await getValue("settings", {})) as Record<string, any>

	return settings[key] || defaultValue
}

const getAllDataPath = async (
	nestPath?: string | string[],
	autoCreate = true,
) => {
	const allDataPath = await getSetting("all_data_path", "")
	const newAllDataPath = path.normalize(allDataPath)

	if (nestPath) {
		const _path = path.join(
			newAllDataPath,
			...(Array.isArray(nestPath) ? nestPath : [nestPath]),
		)

		if (!fs.existsSync(path.dirname(_path)) && autoCreate) {
			fs.mkdirSync(path.dirname(_path), { recursive: true })
		}

		return _path
	}

	return newAllDataPath
}

const getPyBinPath = async () => {
	const python_bin_path = await getSetting("python_bin_path", "")
	const new_all_data_path = path.normalize(python_bin_path)

	return new_all_data_path
}

const setDefaultAllDataPathIfNone = async (defaultPath: string) => {
	const all_data_path = await getSetting("all_data_path", "")
	if (!all_data_path) {
		setValue("settings.all_data_path", defaultPath)
	}
}

export default {
	setValue,
	getValue,
	deleteValue,
	getSetting,
	getSettings,
	getAllDataPath,
	getPyBinPath,
	setDefaultAllDataPathIfNone,
	CONFIG_PATH,
}
