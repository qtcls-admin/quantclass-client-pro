/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { FEN_CLASS_URL } from "@/renderer/components/member-promo/constants"
import { MemberPromoDialog } from "@/renderer/components/member-promo/promo-dialog"
import {
	memberPromoBannerClassName,
	memberPromoBannerLinkClassName,
	memberPromoIconBadgeClassName,
	memberPromoShimmerOverlayClassName,
	memberPromoTextClassName,
} from "@/renderer/components/member-promo/theme"
import { cn } from "@/renderer/lib/utils"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { Sparkles } from "lucide-react"
import {
	type ReactNode,
	type SyntheticEvent,
	createContext,
	useContext,
	useState,
} from "react"

export { FEN_CLASS_URL, MemberPromoDialog }

interface MemberPromoGateContextValue {
	openPromo: () => void
}

const MemberPromoGateContext =
	createContext<MemberPromoGateContextValue | null>(null)

interface MemberPromoBannerProps {
	className?: string
	learnMoreLabel?: string
	onLearnMore?: () => void
}

interface MemberPromoGateProps {
	children: ReactNode
	className?: string
	showBanner?: boolean
	bannerClassName?: string
	learnMoreLabel?: string
}

const MEMBER_INTERACTIVE_SELECTOR =
	"button, a, [role='button'], input, select, textarea, [data-member-action]"

export function MemberPromoBanner({
	className,
	learnMoreLabel = "了解分享会",
	onLearnMore,
}: MemberPromoBannerProps) {
	const gate = useContext(MemberPromoGateContext)
	const handleLearnMore = onLearnMore ?? gate?.openPromo

	return (
		<div
			data-member-promo-banner
			className={cn(memberPromoBannerClassName, className)}
		>
			<div aria-hidden className={memberPromoShimmerOverlayClassName} />
			<div
				className={cn(
					memberPromoIconBadgeClassName,
					"relative z-10 size-6 bg-white/90",
				)}
			>
				<Sparkles className="size-3 text-violet-500" strokeWidth={1.75} />
			</div>
			<span
				className={cn(
					"relative z-10 shrink-0 text-sm font-medium",
					memberPromoTextClassName,
				)}
			>
				分享会专享
			</span>
			<button
				type="button"
				className={memberPromoBannerLinkClassName}
				onClick={handleLearnMore}
			>
				{learnMoreLabel}
			</button>
		</div>
	)
}

/** 非分享会用户：内容可见，点击交互统一弹分享会窗 */
export function MemberPromoGate({
	children,
	className,
	showBanner = true,
	bannerClassName,
	learnMoreLabel,
}: MemberPromoGateProps) {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")
	const [promoOpen, setPromoOpen] = useState(false)

	if (isMember) return <>{children}</>

	function openPromo() {
		setPromoOpen(true)
	}

	function interceptMemberAction(event: SyntheticEvent) {
		const target = event.target as HTMLElement
		if (target.closest("[data-member-promo-banner]")) return
		if (!target.closest(MEMBER_INTERACTIVE_SELECTOR)) return

		event.preventDefault()
		event.stopPropagation()
		openPromo()
	}

	const gateContext: MemberPromoGateContextValue = {
		openPromo,
	}

	return (
		<MemberPromoGateContext.Provider value={gateContext}>
			{showBanner && (
				<MemberPromoBanner
					className={cn("mb-3", bannerClassName)}
					learnMoreLabel={learnMoreLabel}
				/>
			)}
			<div
				className={cn("relative", className)}
				onClickCapture={interceptMemberAction}
			>
				{children}
			</div>
			<MemberPromoDialog open={promoOpen} onOpenChange={setPromoOpen} />
		</MemberPromoGateContext.Provider>
	)
}
