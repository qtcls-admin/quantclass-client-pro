/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

const MANUAL_QMT_GUIDE_URL = "https://bbs.quantclass.cn/thread/88365"
const PLAN_A_TUTORIAL_URL = "https://bbs.quantclass.cn/thread/88365"

export function PlanAAgreementContent() {
	const { openUrl } = window.electronAPI

	return (
		<div className="space-y-5 text-[13px] leading-7 text-foreground/85">
			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					一、手动配置QMT（默认推荐）
				</h3>
				<p>
					切换交易模式的兜底方案，适用于大多数老板。需人工安装并填写 QMT
					交易参数，如遇到困难，请咨询助教帮忙。
				</p>
				<p>
					👉 配置帮助：
					<button
						type="button"
						className="text-primary underline underline-offset-2 hover:opacity-80"
						onClick={() => openUrl(MANUAL_QMT_GUIDE_URL)}
					>
						手动配置QMT指南
					</button>
				</p>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					二、券商特邀（仅限受邀用户）
				</h3>
				<p>
					仅部分合作券商、已获受邀资格的账号可用。符合条件时，客户端能自动匹配券商
					QMT，无需手动填参数。切换前需先升级券商 QMT 终端并配置安装路径。
				</p>
				<p>
					👉 配置帮助：
					<button
						type="button"
						className="text-primary underline underline-offset-2 hover:opacity-80"
						onClick={() => openUrl(PLAN_A_TUTORIAL_URL)}
					>
						券商特邀切换指南
					</button>
				</p>
			</section>

			<section className="space-y-2">
				<h3 className="text-sm font-semibold text-foreground">
					三、重要提醒（必看）
				</h3>
				<p>
					无论选哪种，配置完必须先测试 QMT
					连通性。连接失败会报错且无法交易，务必排查成功后再实盘。
				</p>
			</section>
		</div>
	)
}
