/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { MemberPromoGate } from "@/renderer/components/member-promo"
import { Button } from "@/renderer/components/ui/button"
import ButtonTooltip from "@/renderer/components/ui/button-tooltip"
import { ResearchCenterPage } from "@/renderer/page/research"
import ResearchConfigMasterPage, {
	useLaunchConfigMaster,
} from "@/renderer/page/research/config-master"
import type { RepoDownloadRecord } from "@/shared/types/repo"
import { Loader2, Play } from "lucide-react"
import { useEffect } from "react"

interface LaunchConfigMasterForFrameworkButtonProps {
	record: RepoDownloadRecord
}

function LaunchConfigMasterForFrameworkButton({
	record,
}: LaunchConfigMasterForFrameworkButtonProps) {
	const { isLaunching, launchConfigMaster } = useLaunchConfigMaster()

	const handleLaunch = async () => {
		await launchConfigMaster({
			backtestRoot: record.extractDir,
		})
	}

	return (
		<ButtonTooltip content="启动 config 大师">
			<Button
				type="button"
				size="icon"
				variant="outline"
				className="h-8 w-8"
				disabled={isLaunching}
				onClick={handleLaunch}
			>
				{isLaunching ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Play className="h-4 w-4" />
				)}
			</Button>
		</ButtonTooltip>
	)
}

export default function ResearchFrameworkSourcePage() {
	useEffect(() => {
		void window.electronAPI.writeFrameworkClientEnv()
	}, [])

	return (
		<MemberPromoGate learnMoreLabel="如何成为Config大师?">
			<div className="flex h-full flex-1 flex-col space-y-6">
				<ResearchConfigMasterPage className="shrink-0" />
				<ResearchCenterPage
					apiType="basic-code"
					title="框架源码"
					description="管理本地已下载的框架源码，或下载新版本到框架库"
					className="min-h-0 flex-1"
					recordActions={({ record }) => (
						<LaunchConfigMasterForFrameworkButton record={record} />
					)}
				/>
			</div>
		</MemberPromoGate>
	)
}
