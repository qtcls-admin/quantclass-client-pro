/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin, loadEnv } from "electron-vite"

const sharedConfig = {
	resolve: {
		alias: {
			"@renderer": resolve(__dirname, "src/renderer"),
			"@": resolve(__dirname, "src/"),
		},
	},
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())

	// 定义需要在各个进程中使用的环境变量
	const envVars = {
		"process.env.VITE_BASE_URL": JSON.stringify(
			env.VITE_BASE_URL || "https://api.quantclass.cn",
		),
		"process.env.VITE_XBX_ENV": JSON.stringify(env.VITE_XBX_ENV || mode),
		"process.env.VITE_APP_VERSION": JSON.stringify(
			env.VITE_APP_VERSION || "3.4.0",
		),
	}

	return {
		main: {
			define: envVars,
			resolve: {
				alias: {
					"@": resolve(__dirname, "src/"),
					"@renderer": resolve(__dirname, "src/renderer"),
					"@/hooks": resolve(__dirname, "src/renderer/hooks"),
					"@/registry": resolve(__dirname, "src/renderer/registry"),
				},
			},
			build: {
				sourcemap: true,
				minify: "terser",
				terserOptions: {
					compress: {
						drop_console: true,
						drop_debugger: true,
					},
				},
				rollupOptions: {
					output: {
						format: "es",
					},
					external: ["electron", "better-sqlite3"],
				},
			},
			plugins: [externalizeDepsPlugin()],
		},
		preload: {
			...sharedConfig,
			define: envVars,
			build: {
				terserOptions: {
					compress: {
						drop_console: true,
					},
				},
				rollupOptions: {
					output: {
						format: "es",
					},
				},
			},
			plugins: [externalizeDepsPlugin()],
		},
		renderer: {
			...sharedConfig,
			define: envVars,
			// @ts-ignore
			plugins: [
				react({
					babel: {
						presets: ["jotai/babel/preset"],
					},
				}),
			],
			optimizeDeps: {
				include: ["monaco-editor/esm/vs/editor/editor.worker"],
			},
			resolve: {
				alias: {
					"@": resolve(__dirname, "src/"),
					"@renderer": resolve(__dirname, "src/renderer"),
					"@/hooks": resolve(__dirname, "src/renderer/hooks"),
					"@/registry": resolve(__dirname, "src/renderer/registry"),
				},
			},
			build: {
				sourcemap: false,
				cssMinify: "lightningcss",
				terserOptions: {
					compress: {
						drop_console: true,
					},
				},
				rollupOptions: {
					input: {
						index: resolve(__dirname, "src/renderer/index.html"),
						terminal: resolve(__dirname, "src/renderer/terminal.html"),
					},
					output: {
						manualChunks: {
							react: ["react", "react-dom", "react-router"],
							charts: ["recharts"],
							icons: ["lucide-react"],
						},
					},
				},
			},
		},
	}
})
