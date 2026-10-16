/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { INTRO_PROMO_2024_MARKDOWN } from "@/renderer/components/member-promo/content/intro-markdown-2024"
import { INTRO_PROMO_2025_MARKDOWN } from "@/renderer/components/member-promo/content/intro-markdown-2025"
import { INTRO_PROMO_2026_MARKDOWN } from "@/renderer/components/member-promo/content/intro-markdown-2026"
import {
	FEN_CLASS_LINKS,
	FEN_CLASS_URL_BY_YEAR,
} from "@/renderer/components/member-promo/constants"
import { MemberPromoMarkdown } from "@/renderer/components/member-promo/promo-markdown"
import { MemberPromoTabPanel } from "@/renderer/components/member-promo/promo-tab-panel"

export type FenIntroYear = 2026 | 2025 | 2024

interface IntroPromoContentProps {
	year: FenIntroYear
}

const INTRO_MARKDOWN_BY_YEAR: Record<FenIntroYear, string> = {
	2026: INTRO_PROMO_2026_MARKDOWN,
	2025: INTRO_PROMO_2025_MARKDOWN,
	2024: INTRO_PROMO_2024_MARKDOWN,
}

export function IntroPromoContent({ year }: IntroPromoContentProps) {
	const { openUrl } = window.electronAPI
	const fenItem = FEN_CLASS_LINKS.find((item) => item.year === year)
	const markdown = INTRO_MARKDOWN_BY_YEAR[year]

	if (!fenItem) return null

	const introTitle = `${String(year).slice(-2)}版邢不行策略分享会`

	const buyButton = (
		<button
			type="button"
			className="rounded-md border border-[#3D4C82] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
			style={{ backgroundColor: fenItem.bg }}
			onClick={() => openUrl(FEN_CLASS_URL_BY_YEAR[year])}
		>
			立即购买 · {fenItem.label}
		</button>
	)

	return (
		<MemberPromoTabPanel title={introTitle} footer={buyButton}>
			{markdown ? <MemberPromoMarkdown content={markdown} /> : null}
		</MemberPromoTabPanel>
	)
}
