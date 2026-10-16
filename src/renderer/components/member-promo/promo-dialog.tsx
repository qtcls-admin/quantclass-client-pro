/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import {
	IntroPromoContent,
	type FenIntroYear,
} from "@/renderer/components/member-promo/content/intro"
import {
	memberPromoContentPanelClassName,
	memberPromoDialogClassName,
	memberPromoDialogInnerClassName,
	memberPromoHeaderClassName,
	memberPromoIconBadgeClassName,
	memberPromoShimmerOverlayClassName,
	memberPromoTabBarClassName,
} from "@/renderer/components/member-promo/theme"
import { SectionTabs } from "@/renderer/components/section-tabs"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { cn } from "@/renderer/lib/utils"
import { Sparkles } from "lucide-react"
import { useMemo, useState } from "react"

const FEN_INTRO_TABS = [
	{ key: "2026", label: "26分享会" },
	{ key: "2025", label: "25分享会" },
	{ key: "2024", label: "24分享会" },
] as const

interface MemberPromoDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

function parseFenIntroYear(value: string): FenIntroYear {
	if (value === "2025" || value === "2024") return Number(value) as FenIntroYear
	return 2026
}

export function MemberPromoDialog({
	open,
	onOpenChange,
}: MemberPromoDialogProps) {
	const [introYear, setIntroYear] = useState<FenIntroYear>(2026)

	const sectionTabs = useMemo(() => [...FEN_INTRO_TABS], [])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={memberPromoDialogClassName}>
				<DialogTitle className="sr-only">分享会专享功能</DialogTitle>
				<DialogDescription className="sr-only">
					了解策略分享会专属功能
				</DialogDescription>

				<div className={memberPromoDialogInnerClassName}>
					<div aria-hidden className={memberPromoShimmerOverlayClassName} />

					<div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3">
						<div className={cn(memberPromoHeaderClassName, "pr-8")}>
							<div className={memberPromoIconBadgeClassName}>
								<Sparkles
									className="size-3.5 text-violet-500"
									strokeWidth={1.75}
								/>
							</div>
							<span className="text-sm font-semibold">分享会专享功能</span>
						</div>

						<SectionTabs
							tabs={sectionTabs}
							value={`${introYear}`}
							onValueChange={(value) => setIntroYear(parseFenIntroYear(value))}
							className={memberPromoTabBarClassName}
						/>

						<div className={memberPromoContentPanelClassName}>
							<IntroPromoContent year={introYear} />
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
