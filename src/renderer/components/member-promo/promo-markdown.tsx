/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { cn } from "@/renderer/lib/utils"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"

const PROMO_MARKDOWN_CLASS =
	"max-w-none text-sm leading-relaxed text-neutral-800 dark:text-neutral-100 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_p]:my-2 [&_a]:text-[#337ab7] [&_a]:underline-offset-2 hover:[&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:mx-auto [&_img]:my-3 [&_img]:max-w-full [&_figure]:my-4 [&_figure_div]:flex [&_figure_div]:flex-nowrap [&_figure_div]:gap-1.5 [&_figure_div]:overflow-x-auto [&_figure_div]:rounded-2xl [&_figure_div]:border [&_figure_div]:border-border [&_figure_div]:bg-background [&_figure_div]:p-2 [&_figure_div]:shadow-inner [&_figure_div_img]:h-[200px] [&_figure_div_img]:w-auto [&_figure_div_img]:shrink-0 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_iframe]:my-3 [&_iframe]:min-h-[220px] [&_iframe]:w-full [&_iframe]:rounded-md"

function preprocessMarkdownLinks(content: string) {
	// 勿把 ![alt](url) 当成链接，否则 25 期等正文图片无法渲染
	return content.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

export function MemberPromoMarkdown({ content }: { content: string }) {
	const { openUrl } = window.electronAPI

	const components: Components = {
		a: ({ href, children }) => (
			<a
				href={href}
				onClick={(event) => {
					event.preventDefault()
					if (href) openUrl(href)
				}}
				className="text-[#337ab7] underline-offset-2 hover:underline"
			>
				{children}
			</a>
		),
	}

	return (
		<div className={cn(PROMO_MARKDOWN_CLASS)}>
			<ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
				{preprocessMarkdownLinks(content)}
			</ReactMarkdown>
		</div>
	)
}
