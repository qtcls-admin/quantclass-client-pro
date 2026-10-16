import {
	MemberPromoBanner,
	MemberPromoGate,
} from "@/renderer/components/member-promo"
import {
	SectionPage,
	type SectionTabItem,
} from "@/renderer/components/section-tabs"
import ResearchFrameworkSourcePage from "@/renderer/page/research/basic-code"
import ResearchBasicCourseFrameworkPage from "@/renderer/page/research/basic-course-code"
import ResearchStrategyLibraryPage from "@/renderer/page/research/strategies"
import { userAtom } from "@/renderer/store/user"
import { checkPermission } from "@/shared/lib/permission"
import { useAtomValue } from "jotai"
import { type FC, useMemo } from "react"

const MEMBER_TABS = [
	{ key: "strategy_library", label: "精心随机策略库" },
	{ key: "framework_source", label: "框架源码" },
] as const

const BASIC_COURSE_TAB = {
	key: "basic_course_framework",
	label: "基础课程框架源码",
} as const

type TabKey = (typeof MEMBER_TABS)[number]["key"] | typeof BASIC_COURSE_TAB.key

const TAB_LEARN_MORE_LABEL: Partial<Record<TabKey, string>> = {
	strategy_library: "为什么需要精心随机？",
}

const ResearchSectionPage: FC = () => {
	const { permissions } = useAtomValue(userAtom)
	const isMember = checkPermission(permissions, "isMember")

	const tabs: readonly SectionTabItem<TabKey>[] = useMemo(
		() => (isMember ? MEMBER_TABS : [BASIC_COURSE_TAB, ...MEMBER_TABS]),
		[isMember],
	)

	return (
		<SectionPage
			tabs={tabs}
			defaultTab={isMember ? "strategy_library" : BASIC_COURSE_TAB.key}
		>
			{(activeTab: TabKey) => {
				if (activeTab === "basic_course_framework") {
					return <ResearchBasicCourseFrameworkPage />
				}

				if (activeTab === "strategy_library") {
					return (
						<MemberPromoGate className="h-full" showBanner={false}>
							<ResearchStrategyLibraryPage
								headerAddon={
									!isMember ? (
										<MemberPromoBanner
											learnMoreLabel={TAB_LEARN_MORE_LABEL.strategy_library}
										/>
									) : undefined
								}
							/>
						</MemberPromoGate>
					)
				}

				return <ResearchFrameworkSourcePage />
			}}
		</SectionPage>
	)
}

export default ResearchSectionPage
