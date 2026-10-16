/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { FEN_CLASS_URL_BY_YEAR } from "@/renderer/components/member-promo/constants"
import {
	memberPromoBodyTextClassName,
	memberPromoCarouselFrameClassName,
	memberPromoCarouselPlaceholderClassName,
	memberPromoFooterButtonClassName,
	memberPromoMutedTextClassName,
	memberPromoTitleClassName,
} from "@/renderer/components/member-promo/theme"
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/renderer/components/ui/carousel"
import { cn } from "@/renderer/lib/utils"
import { type ReactNode, useMemo, useState } from "react"
import Lightbox from "yet-another-react-lightbox"
import Captions from "yet-another-react-lightbox/plugins/captions"
import "yet-another-react-lightbox/plugins/captions.css"
import "yet-another-react-lightbox/styles.css"

export interface MemberPromoImage {
	src: string
	caption?: string
}

interface MemberPromoTabPanelProps {
	title: string
	images?: Array<string | MemberPromoImage>
	headerBelowTitle?: ReactNode
	footer?: ReactNode
	children: ReactNode
}

function normalizeImages(
	images: Array<string | MemberPromoImage>,
): MemberPromoImage[] {
	return images.map((image) =>
		typeof image === "string" ? { src: image } : image,
	)
}

function PromoImageCarousel({
	images,
}: {
	images: Array<string | MemberPromoImage>
}) {
	const items = useMemo(() => normalizeImages(images), [images])
	const [lightboxIndex, setLightboxIndex] = useState(-1)
	const slides = useMemo(
		() =>
			items.map((item) => ({
				src: item.src,
				alt: item.caption ?? "",
				title: item.caption,
			})),
		[items],
	)

	if (items.length === 0) {
		return (
			<div className={memberPromoCarouselPlaceholderClassName}>图片待补充</div>
		)
	}

	const hasMultiple = items.length > 1

	return (
		<>
			<div className={memberPromoCarouselFrameClassName}>
				<Carousel opts={{ loop: hasMultiple }} className="w-full px-10">
					<CarouselContent className="-ml-0">
						{items.map((item, index) => (
							<CarouselItem
								key={`${item.src}-${index}`}
								className="flex flex-col items-center justify-center gap-2 pl-0"
							>
								<button
									type="button"
									className="group cursor-zoom-in"
									onClick={() => setLightboxIndex(index)}
								>
									<img
										src={item.src}
										alt={item.caption ?? ""}
										className="mx-auto max-h-[min(48vh,420px)] max-w-full rounded-lg object-contain transition-opacity group-hover:opacity-90"
									/>
								</button>
								{item.caption ? (
									<p className="text-center text-sm text-muted-foreground">
										{item.caption}
									</p>
								) : null}
							</CarouselItem>
						))}
					</CarouselContent>
					{hasMultiple && (
						<>
							<CarouselPrevious className="-left-1 top-1/2 h-8 w-8 -translate-y-1/2 bg-white/90 hover:bg-white dark:bg-background/90" />
							<CarouselNext className="-right-1 top-1/2 h-8 w-8 -translate-y-1/2 bg-white/90 hover:bg-white dark:bg-background/90" />
						</>
					)}
				</Carousel>
			</div>

			<Lightbox
				open={lightboxIndex >= 0}
				index={lightboxIndex}
				close={() => setLightboxIndex(-1)}
				slides={slides}
				plugins={[Captions]}
				captions={{ showToggle: false }}
				carousel={{ finite: !hasMultiple }}
				controller={{ closeOnBackdropClick: true }}
			/>
		</>
	)
}

export function MemberPromoFenClassButton({
	year,
	label,
}: {
	year: keyof typeof FEN_CLASS_URL_BY_YEAR
	label: string
}) {
	const { openUrl } = window.electronAPI

	return (
		<div className="mt-5 flex justify-center pb-1">
			<button
				type="button"
				className={memberPromoFooterButtonClassName}
				onClick={() => openUrl(FEN_CLASS_URL_BY_YEAR[year])}
			>
				{label}
			</button>
		</div>
	)
}

export function MemberPromoTabPanel({
	title,
	images = [],
	headerBelowTitle,
	footer,
	children,
}: MemberPromoTabPanelProps) {
	return (
		<div
			className={cn(
				"flex h-full min-h-0 flex-col",
				memberPromoBodyTextClassName,
			)}
		>
			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				<h2
					className={cn(
						"text-center text-lg font-bold tracking-wide",
						memberPromoTitleClassName,
					)}
				>
					{title}
				</h2>

				{headerBelowTitle ? (
					<div className="mt-3">{headerBelowTitle}</div>
				) : null}

				{images.length > 0 ? (
					<div className="mt-3">
						<PromoImageCarousel images={images} />
					</div>
				) : null}

				<div className="mt-4 text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
					{children}
				</div>
			</div>

			{footer ? (
				<div className="-mx-4 -mb-4 mt-3 flex shrink-0 items-center justify-center border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm">
					{footer}
				</div>
			) : null}
		</div>
	)
}

export function MemberPromoPlaceholderBody() {
	return (
		<p
			className={cn("py-8 text-center text-sm", memberPromoMutedTextClassName)}
		>
			内容即将补充
		</p>
	)
}
