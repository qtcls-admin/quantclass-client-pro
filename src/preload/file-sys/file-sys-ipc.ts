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
import os from "node:os"
import path from "node:path"
import { getJsonDataFromFile } from "@/main/core/dataList.js"
import { tokenStore } from "@/main/lib/tokenStore.js"
import { parsePythonConfig } from "@/main/pythonRunner.js"
import store, { rStore } from "@/main/store/index.js"
import { killKernalByForce, sendErrorToClient } from "@/main/utils/tools.js"
import logger from "@/main/utils/wiston.js"
import { BASE_URL, CLIENT_VERSION } from "@/main/vars.js"
import { LIBRARY_TYPE } from "@/shared/constants.js"
import type { ManualStockSelectResultItem } from "@/shared/types/manual-stock-select.js"
import { parse } from "csv-parse/sync"
import {
	BrowserWindow,
	type OpenDialogOptions,
	app,
	dialog,
	ipcMain,
	shell,
} from "electron"
import { keys } from "lodash-es"

async function strategyResultPathHandler(): Promise<void> {
	ipcMain.handle("strategy-result-path", async (_, mode = "backtest") => {
		const folder = mode === "backtest" ? "回测结果" : "实盘选股结果"
		return await store.getAllDataPath(["real_trading", "data", folder], true)
	})
}

async function createRealTradingDirHandler(): Promise<void> {
	ipcMain.handle(
		"create-real-trading-dir",
		async (_, dirName = "real_trading") => {
			const all_data_path = await store.getSetting("all_data_path", "")

			const fullPath = path.join(all_data_path, dirName)

			const isExist = fs.existsSync(fullPath)
			if (isExist) {
				logger.info(`real_trading dir is exist: ${fullPath}`)
				return fullPath
			}

			fs.mkdirSync(fullPath, { recursive: true })
			logger.info(`create real_trading dir: ${fullPath}`)

			return fullPath
		},
	)
}

// async function StrategyDirExitHandler(): Promise<void> {
// 	ipcMain.handle("strategy-dir-exit", async () => {
// 		const all_data_path = await store.getSetting("all_data_path", "")

// 		const fullPath = path.join(all_data_path, "strategy")

// 		return fs.existsSync(fullPath)
// 	})
// }

async function selectFileDirHandler(): Promise<void> {
	ipcMain.handle(
		"open-directory-select",
		async (
			_event,
			properties: OpenDialogOptions["properties"],
			opts: OpenDialogOptions,
		) => {
			const lastPath: string = await store.getValue(
				"last_open_dir",
				os.homedir(),
			)

			const options: OpenDialogOptions = {
				defaultPath: lastPath,
				properties: properties,
				...opts,
			}
			const { canceled, filePaths } = await dialog.showOpenDialog(
				BrowserWindow.getFocusedWindow()!,
				options,
			)

			if (!canceled) {
				if (properties?.includes("openFile")) {
					store.setValue("last_open_dir", path.dirname(filePaths[0]))
				} else {
					store.setValue("last_open_dir", filePaths[0])
				}
				if (properties?.includes("multiSelections")) {
					return filePaths
				}
				return filePaths[0]
			}
			return null
		},
	)
}

async function openDirectoryHandler(): Promise<void> {
	ipcMain.handle("open-directory", async (_event, pathArray) => {
		// path 是一个数组，帮我拼接起来
		const fullPath = path.join(...pathArray).replace(/\\\\/g, "\\")
		// 判断系统是windows
		const res = await shell.openPath(fullPath)
		logger.info(`${res}`)
	})
}

async function openDataDirectoryHandler(): Promise<void> {
	ipcMain.handle(
		"open-data-directory",
		async (_event, pathArray: string[] | string = []) => {
			const _path = await store.getAllDataPath(
				Array.isArray(pathArray) ? pathArray : [pathArray],
				true,
			)
			await shell.openPath(_path)
		},
	)
}

async function openUserDirectoryHandler(): Promise<void> {
	ipcMain.handle(
		"open-user-directory",
		async (_event, pathArray: string[] | string = []) => {
			const _path = path.join(
				app.getPath("userData"),
				...(Array.isArray(pathArray) ? pathArray : [pathArray]),
			)
			await shell.openPath(_path)
		},
	)
}

// async function checkpythonLockHandler(): Promise<void> {
// 	ipcMain.handle("check-python-lock", async () => {
// 		const status = await checkLock()

// 		return {
// 			pending: status,
// 		}
// 	})
// }

function openUrlHandler() {
	ipcMain.handle("open-url", async (_, url: string) => {
		await shell.openExternal(url)
	})
}

async function saveRealMarketDataHandler(): Promise<void> {
	ipcMain.handle(
		"save-real-market-data",
		async (_, data: Record<string, any>) => {
			rStore.set(data)
		},
	)
}

async function cleanRealMarketDataHandler(): Promise<void> {
	ipcMain.handle("clean-real-market-data", async (_Ipc) => {
		const rStoreKeys = keys(rStore.store)
		if (rStoreKeys.length > 0) {
			for (const key of rStoreKeys) {
				rStore.delete(key)
			}
			logger.info(`[real_market] del keys: ${rStoreKeys}`)
		} else {
			logger.info("[real_market] 无数据需要清理")
		}
	})
}

async function clearRealMarketDataHandler(): Promise<void> {
	ipcMain.handle("clear-real-market-data", async () => {
		rStore.clear()
	})
}

async function killRocketHandler(): Promise<void> {
	ipcMain.handle("kill-rocket", async () => {
		await killKernalByForce("rocket")
	})
}

async function checkDBFileHandler(): Promise<void> {
	ipcMain.handle("check-db-file", async () => {
		const dbPath = await store.getAllDataPath(
			["code", "data", "FuelBinStat.db"],
			false,
		)
		return fs.existsSync(dbPath)
	})
}

async function importSelectStockHandler(): Promise<void> {
	// 获取实盘路径
	const realTradingPath = await store.getAllDataPath(["real_trading"], true)

	ipcMain.handle("import-select-stock", async (_, configFilePath: string) => {
		try {
			const fuelProTradingPath = await store.getAllDataPath(
				["real_trading"],
				true,
			)
			// 如果是Windows操作系统，需要保证当前文件夹下，所有的文件都不是“只读”的
			// if (platform.isWindows) {
			// 	logger.info("[import] 重置只读权限")
			// 	execSync(`chcp 65001 | attrib -r "${fuelProTradingPath}\*" /s /d`, {
			// 		stdio: ["pipe", "ignore", "ignore"],
			// 	})
			// }
			let configJsonStr: string | undefined
			let backtestName: string | undefined
			let reTimingStr: string | null | undefined

			// -- 检查 config.py 文件是否存在
			if (!fs.existsSync(configFilePath)) {
				await sendErrorToClient("未找到 config.py 文件")
				logger.error("[importLibraryDirHandler] 未找到 config.py 文件")
				throw new Error("未找到 config.py 文件")
			}
			console.log("[import] config:", configFilePath)

			// -- 读取并解析 config.py（通过内嵌 Python 解析）
			try {
				const result = await parsePythonConfig(configFilePath, [
					"strategy_list",
					"backtest_name",
					"re_timing",
				])
				if (!result.strategy_list) {
					logger.error("[importLibraryDirHandler] 解析 strategy_list 失败")
					return { success: false, error: "解析 strategy_list 失败" }
				}
				configJsonStr = JSON.stringify(result.strategy_list, null, 2)
				backtestName = result.backtest_name ?? "默认策略"
				reTimingStr = result.re_timing ? JSON.stringify(result.re_timing) : null
				logger.info(`[import] 解析 config.py 文件成功，策略名：${backtestName}`)
			} catch (error) {
				logger.error(`[import] 解析 config.py 文件失败: ${error}`)
				return { success: false, error: "解析 config.py 文件失败" }
			}

			// -- 检查策略库和因子库文件夹是否存在
			// if (!fs.existsSync(strategyPath) || !fs.existsSync(factorPath)) {
			// 	await sendErrorToClient("源路径中未找到策略库或因子库文件夹")
			// 	logger.error(
			// 		"[importLibraryDirHandler] 源路径中未找到策略库或因子库文件夹",
			// 	)
			// 	throw new Error("源路径中未找到策略库或因子库文件夹")
			// }

			// -- 确保目标路径存在
			// if (!fs.existsSync(fuelProTradingPath)) {
			// 	fs.mkdirSync(fuelProTradingPath, { recursive: true })
			// }

			// -- 复制 config.py 到目标目录
			// 不需要复制 config.py 文件
			// fs.copyFileSync(
			// 	configFilePath,
			// 	path.join(fuelProTradingPath, "config.py"),
			// )

			// -- 复制策略库文件（合并模式：保留已有文件，同名覆盖）
			const readonlyFiles: string[] = []
			const copyFiles = (sourcePath: string, targetPath: string) => {
				logger.info(`[import] 复制文件夹: ${sourcePath} -> ${targetPath}`)
				if (!fs.existsSync(targetPath)) {
					fs.mkdirSync(targetPath, { recursive: true })
				}

				const files = fs.readdirSync(sourcePath)
				for (const file of files) {
					const sourceFile = path.join(sourcePath, file)
					const targetFile = path.join(targetPath, file)

					if (fs.statSync(sourceFile).isDirectory()) {
						copyFiles(sourceFile, targetFile)
					} else {
						try {
							fs.copyFileSync(sourceFile, targetFile)
						} catch (error) {
							const err = error as NodeJS.ErrnoException
							if (
								err.syscall === "copyfile" &&
								(err.code === "EACCES" || err.code === "EPERM")
							) {
								readonlyFiles.push(targetFile)
								logger.warn(`[import] 只读文件无法覆盖: ${targetFile}`)
								continue
							}
							throw error
						}
					}
				}
			}

			// -- 获取根目录路径（config.py 所在的目录）
			const rootPath = path.dirname(configFilePath)

			// -- 复制策略库(如需)
			const strategyPath = path.join(rootPath, "策略库")
			fs.existsSync(strategyPath) &&
				copyFiles(strategyPath, path.join(fuelProTradingPath, "策略库"))

			// -- 复制因子库(如需)
			const factorPath = path.join(rootPath, "因子库")
			fs.existsSync(factorPath) &&
				copyFiles(factorPath, path.join(fuelProTradingPath, "因子库"))

			// -- 复制信号库(如需)
			const timingPath = path.join(rootPath, "信号库")
			fs.existsSync(timingPath) &&
				copyFiles(timingPath, path.join(fuelProTradingPath, "信号库"))

			// -- 复制外部数据(如需)
			const externalDataPath = path.join(rootPath, "外部数据")
			fs.existsSync(externalDataPath) &&
				copyFiles(externalDataPath, path.join(realTradingPath, "外部数据"))

			// -- 复制截面因子库(如需)
			const sectionFactorPath = path.join(rootPath, "截面因子库")
			fs.existsSync(sectionFactorPath) &&
				copyFiles(sectionFactorPath, path.join(realTradingPath, "截面因子库"))

			if (readonlyFiles.length > 0) {
				return {
					success: false,
					error: "存在只读文件",
					readonlyFiles,
				}
			}

			return {
				success: true,
				configJson: configJsonStr,
				backtestName,
				reTiming: reTimingStr,
			}
		} catch (error) {
			logger.error(`[import] 导入文件夹失败: ${JSON.stringify(error, null, 2)}`)
			throw error
		}
	})
}

async function importFusionHandler(): Promise<void> {
	ipcMain.handle("import-fusion", async (_, configFilePath: string) => {
		try {
			// 获取实盘路径
			const realTradingPath = await store.getAllDataPath(["real_trading"], true)
			let backtestName = ""
			let jsonStr = ""
			let importType: "fusion" | "pos" | "select" = "select" // 默认是fusion，兼容select和pos

			// -- 检查 config.py 文件是否存在
			if (!fs.existsSync(configFilePath)) {
				await sendErrorToClient("未找到 config.py 文件")
				logger.error("[importLibraryDirHandler] 未找到 config.py 文件")
				throw new Error("未找到 config.py 文件")
			}
			console.log("[import] config:", configFilePath)

			// -- 读取并解析 config.py（通过内嵌 Python 解析）
			try {
				const result = await parsePythonConfig(configFilePath, [
					"strategies",
					"pos_strategy",
					"strategy_list",
					"backtest_name",
				])
				if (result.strategies) {
					importType = "fusion"
					jsonStr = JSON.stringify(result.strategies, null, 2)
				} else if (result.pos_strategy) {
					importType = "pos"
					jsonStr = JSON.stringify(result.pos_strategy, null, 2)
				} else if (result.strategy_list) {
					importType = "select"
					jsonStr = JSON.stringify(result.strategy_list, null, 2)
				} else {
					logger.error("[importLibraryDirHandler] 解析 strategies 失败")
					return { success: false, error: "解析 strategies 失败" }
				}
				backtestName = result.backtest_name ?? "默认策略"
				logger.info(
					`[import] 解析 config.py 文件成功，策略名：${backtestName}，类型：${importType}`,
				)
			} catch (error) {
				logger.error(`[import] 解析 config.py 文件失败: ${error}`)
				return { success: false, error: "解析 config.py 文件失败" }
			}

			// -- 复制策略库文件
			const readonlyFiles: string[] = []
			const copyFiles = (sourcePath: string, targetPath: string) => {
				logger.info(`[import] 复制文件夹: ${sourcePath} -> ${targetPath}`)
				if (!fs.existsSync(targetPath)) {
					fs.mkdirSync(targetPath, { recursive: true })
				}

				const files = fs.readdirSync(sourcePath)
				for (const file of files) {
					const sourceFile = path.join(sourcePath, file)
					const targetFile = path.join(targetPath, file)

					if (fs.statSync(sourceFile).isDirectory()) {
						copyFiles(sourceFile, targetFile)
					} else {
						try {
							fs.copyFileSync(sourceFile, targetFile)
						} catch (error) {
							const err = error as NodeJS.ErrnoException
							if (
								err.syscall === "copyfile" &&
								(err.code === "EACCES" || err.code === "EPERM")
							) {
								readonlyFiles.push(targetFile)
								logger.warn(`[import] 只读文件无法覆盖: ${targetFile}`)
								continue
							}
							throw error
						}
					}
				}
			}

			// -- 获取根目录路径（config.py 所在的目录）
			const rootPath = path.dirname(configFilePath)

			// -- 复制策略库(如需)
			const strategyPath = path.join(rootPath, "策略库")
			fs.existsSync(strategyPath) &&
				copyFiles(strategyPath, path.join(realTradingPath, "策略库"))

			// -- 复制因子库(如需)
			const factorPath = path.join(rootPath, "因子库")
			fs.existsSync(factorPath) &&
				copyFiles(factorPath, path.join(realTradingPath, "因子库"))

			// -- 复制信号库(如需)
			const timingPath = path.join(rootPath, "信号库")
			fs.existsSync(timingPath) &&
				copyFiles(timingPath, path.join(realTradingPath, "信号库"))

			// -- 复制仓位管理(如需)
			const posPath = path.join(rootPath, "仓位管理")
			fs.existsSync(posPath) &&
				copyFiles(posPath, path.join(realTradingPath, "仓位管理"))

			// -- 复制外部数据(如需)
			const externalDataPath = path.join(rootPath, "外部数据")
			fs.existsSync(externalDataPath) &&
				copyFiles(externalDataPath, path.join(realTradingPath, "外部数据"))

			// -- 复制截面因子库(如需)
			const sectionFactorPath = path.join(rootPath, "截面因子库")
			fs.existsSync(sectionFactorPath) &&
				copyFiles(sectionFactorPath, path.join(realTradingPath, "截面因子库"))

			if (readonlyFiles.length > 0) {
				return {
					success: false,
					error: "存在只读文件",
					readonlyFiles,
				}
			}

			return {
				success: true,
				jsonStr,
				backtestName,
				importType,
			}
		} catch (error) {
			logger.error(`[import] 导入文件夹失败: ${JSON.stringify(error, null, 2)}`)
			throw error
		}
	})
}

async function parseCsvFileHandler(): Promise<void> {
	ipcMain.handle(
		"parse-csv-file",
		async (_, csvfileName = "最新选股结果", mode = "backtest") => {
			let folder: string
			switch (mode) {
				case "backtest":
					folder = "回测结果"
					break
				case "trading":
					folder = "实盘选股结果"
					break
				default:
					folder = "回测结果"
					break
			}

			try {
				const libraryType = await store.getValue(LIBRARY_TYPE, "pos")
				const backtestName = await store.getValue(
					`${libraryType === "pos" ? "pos_mgmt" : "select_stock"}.backtest_name`,
					"策略库",
				)
				const filePath = await store.getAllDataPath([
					"real_trading",
					"data",
					folder, // -- 回测结果 or 实盘选股结果，具体看回测还是实盘
					backtestName,
					`${csvfileName}.csv`,
				])

				// -- 检查文件是否存在
				if (!fs.existsSync(filePath)) {
					logger.error("[parseCsvFileHandler] CSV 文件不存在")
					return { success: false, error: "CSV 文件不存在", data: [] }
				}

				// -- 读取 CSV 文件内容并移除 BOM
				const content = fs
					.readFileSync(filePath, "utf-8")
					.replace(/^\uFEFF/, "")

				// -- 解析 CSV 内容为 JSON
				const records = parse(content, {
					columns: true, // -- 使用第一行作为列名
					skip_empty_lines: true, // -- 跳过空行
				})

				// -- 通过序列化和反序列化来规范化数据格式
				const normalizedRecords = JSON.parse(JSON.stringify(records))

				logger.info(
					`[csv] 成功解析 ${filePath}，共 ${normalizedRecords.length} 条记录`,
				)
				return { success: true, data: normalizedRecords }
			} catch (error) {
				logger.error(
					`[parseCsvFileHandler] 解析 CSV 文件失败: ${JSON.stringify(error, null, 2)}`,
				)
				return { success: false, error: "解析 CSV 文件失败", data: [] }
			}
		},
	)
}

async function readChangelogHandler(): Promise<void> {
	ipcMain.handle("read-changelog", async () => {
		try {
			// 优先从 resources 目录读取（打包后的路径）
			const resourcesPath = path.join(process.resourcesPath, "CHANGELOG.md")
			// 备用路径：开发环境的项目根目录
			const devPath = path.join(process.cwd(), "CHANGELOG.md")

			let changelogPath: string
			if (fs.existsSync(resourcesPath)) {
				changelogPath = resourcesPath
				logger.info(`[readChangelogHandler] 使用打包路径: ${resourcesPath}`)
			} else if (fs.existsSync(devPath)) {
				changelogPath = devPath
				logger.info(`[readChangelogHandler] 使用开发路径: ${devPath}`)
			} else {
				logger.error("[readChangelogHandler] CHANGELOG.md 文件不存在")
				return { success: false, error: "CHANGELOG.md 文件不存在", data: "" }
			}

			// -- 读取文件内容
			const content = fs.readFileSync(changelogPath, "utf-8")

			logger.info("[readChangelogHandler] 成功读取 CHANGELOG.md")
			return { success: true, data: content }
		} catch (error) {
			logger.error(
				`[readChangelogHandler] 读取 CHANGELOG.md 文件失败: ${JSON.stringify(error, null, 2)}`,
			)
			return { success: false, error: "读取 CHANGELOG.md 文件失败", data: "" }
		}
	})
}

async function importPositionHandler(): Promise<void> {
	ipcMain.handle("load-position-json", async (_, filename: string) => {
		try {
			return await getJsonDataFromFile(
				["real_trading", "rocket", "data", "账户信息", `${filename}.json`],
				"持仓信息文件不存在或为空",
			)
		} catch (error) {
			logger.error(
				`[importPositionHandler] 导入持仓文件失败: ${JSON.stringify(error, null, 2)}`,
			)
			return { success: false, error: "导入持仓文件失败", data: [] }
		}
	})
}

async function clearFactorCacheHandler(): Promise<void> {
	ipcMain.handle("clear-factor-cache", async () => {
		try {
			const allDataPath = (await store.getSetting(
				"all_data_path",
				"",
			)) as string
			if (!allDataPath?.trim()) {
				return {
					success: false,
					message: "未配置数据存储路径",
				}
			}

			const factorCachePath = await store.getAllDataPath(
				["real_trading", "data", "因子缓存"],
				false,
			)

			if (!fs.existsSync(factorCachePath)) {
				return { success: true, skipped: true as const }
			}

			const stat = fs.statSync(factorCachePath)
			if (!stat.isDirectory()) {
				return {
					success: false,
					message: "目标路径不是文件夹，已取消操作",
				}
			}

			fs.rmSync(factorCachePath, {
				recursive: true,
				force: true,
			})
			logger.info(`[factor-cache] cleared: ${factorCachePath}`)
			return { success: true, skipped: false as const }
		} catch (error) {
			logger.error(
				`[factor-cache] clear failed: ${JSON.stringify(error, null, 2)}`,
			)
			return {
				success: false,
				message: "清除因子缓存失败",
			}
		}
	})
}

async function loadManualStockResultHandler(): Promise<void> {
	ipcMain.handle("load-manual-stock-result", async (_, filename: string) => {
		try {
			const filePath = await store.getAllDataPath(
				["real_trading", "data", "手工策略", `${filename}.json`],
				false,
			)

			if (!fs.existsSync(filePath)) {
				return { success: true, data: [] }
			}

			const raw = fs.readFileSync(filePath, "utf-8").trim()
			if (!raw) {
				return { success: true, data: [] }
			}

			const data = JSON.parse(raw) as unknown
			if (!Array.isArray(data)) {
				logger.warn("[手工选股] 结果文件格式无效")
				return {
					success: false,
					data: [],
					message: "选股结果文件格式无效",
				}
			}

			logger.info(`[手工选股] 结果已读取: ${filePath}`)
			return { success: true, data }
		} catch (error) {
			logger.error(`[手工选股] 读取失败: ${JSON.stringify(error, null, 2)}`)
			return {
				success: false,
				data: [],
				message: "读入选股结果失败",
			}
		}
	})
}

async function saveManualStockResultHandler(): Promise<void> {
	ipcMain.handle(
		"save-manual-stock-result",
		async (_, filename: string, data: ManualStockSelectResultItem[]) => {
			try {
				const filePath = await store.getAllDataPath(
					["real_trading", "data", "手工策略", `${filename}.json`],
					true,
				)
				fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
				logger.info(`[手工选股] 结果已写入: ${filePath}`)
				return { success: true, filePath }
			} catch (error) {
				logger.error(`[手工选股] 写入失败: ${JSON.stringify(error, null, 2)}`)
				return { success: false, message: "写入选股结果失败" }
			}
		},
	)
}

async function deleteManualStockReselectFlagHandler(): Promise<void> {
	ipcMain.handle("delete-manual-stock-reselect-flag", async () => {
		try {
			const filePath = await store.getAllDataPath(
				["real_trading", "data", "timestamp", "flag.json"],
				false,
			)

			if (!fs.existsSync(filePath)) {
				logger.warn(`[手工选股] 立即重新选股失败，文件不存在: ${filePath}`)
				return { success: false, message: "立即重新选股失败" }
			}

			fs.unlinkSync(filePath)
			logger.info(`[手工选股] 已删除重新选股标记: ${filePath}`)
			return { success: true }
		} catch (error) {
			logger.error(
				`[手工选股] 立即重新选股失败: ${JSON.stringify(error, null, 2)}`,
			)
			return { success: false, message: "立即重新选股失败" }
		}
	})
}

async function deletePeriodOffsetHandler(): Promise<void> {
	ipcMain.handle("delete-period-offset", async () => {
		try {
			// 检查 rocket 和选股内核是否正在运行
			const { isAnyKernalBusy } = await import("@/main/utils/tools.js")
			const kernalsBusy = await isAnyKernalBusy(["rocket", "fusion"])

			if (kernalsBusy) {
				logger.warn(
					"[updatePeriodOffset] 内核正在运行中，无法更新 period_offset.csv",
				)
				return {
					success: false,
					message: "选股或实盘内核正在运行中，无法更新 period_offset.csv",
				}
			}

			const periodOffsetPath = await store.getAllDataPath(
				"period_offset.csv",
				false,
			)

			// 删除旧文件
			if (fs.existsSync(periodOffsetPath)) {
				fs.unlinkSync(periodOffsetPath)
				logger.info("[updatePeriodOffset] 已删除旧的 period_offset.csv")
			}

			// 从 API 下载新文件
			const downloadUrl = `${BASE_URL}/api/data/client/real-trading/period-offset?client=${CLIENT_VERSION}`
			logger.info(`[updatePeriodOffset] 开始下载: ${downloadUrl}`)

			const token = await tokenStore.getAccessToken()
			const headers: HeadersInit = {}
			if (token) {
				headers.Authorization = `Bearer ${token}`
			}

			const response = await fetch(downloadUrl, {
				method: "POST",
				headers,
			})

			if (!response.ok) {
				logger.error(
					`[updatePeriodOffset] 下载失败，HTTP 状态: ${response.status}`,
				)
				return {
					success: false,
					message: `下载 period_offset.csv 失败: HTTP ${response.status}`,
				}
			}

			// 使用 arrayBuffer 处理二进制数据，避免乱码
			const buffer = Buffer.from(await response.arrayBuffer())
			const { writeFile } = await import("node:fs/promises")
			await writeFile(periodOffsetPath, buffer)

			logger.info("[updatePeriodOffset] 成功更新 period_offset.csv")
			return { success: true, message: "成功更新 period_offset.csv" }
		} catch (error) {
			logger.error(
				`[updatePeriodOffset] 更新 period_offset.csv 失败: ${JSON.stringify(error, null, 2)}`,
			)
			return { success: false, message: "更新 period_offset.csv 失败" }
		}
	})
}

export const regFileSysIPC = () => {
	openUrlHandler()
	killRocketHandler()
	checkDBFileHandler()
	selectFileDirHandler()
	openDirectoryHandler()
	openDataDirectoryHandler()
	openUserDirectoryHandler()
	parseCsvFileHandler()
	readChangelogHandler()
	// checkpythonLockHandler()
	importSelectStockHandler()
	importFusionHandler()
	saveRealMarketDataHandler()
	cleanRealMarketDataHandler()
	clearRealMarketDataHandler()
	createRealTradingDirHandler()
	strategyResultPathHandler()
	importPositionHandler()
	deletePeriodOffsetHandler()
	clearFactorCacheHandler()
	loadManualStockResultHandler()
	saveManualStockResultHandler()
	deleteManualStockReselectFlagHandler()
	console.log("[reg] file-sys-ipc")
}
