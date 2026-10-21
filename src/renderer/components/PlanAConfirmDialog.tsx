/**
 * quantclass-client
 * Copyright (c) 2025 量化小讲堂
 *
 * Licensed under the Business Source License 1.1 (BUSL-1.1).
 * Additional Use Grant: None
 * Change Date: 2028-08-22 | Change License: GPL-3.0-or-later
 * See the LICENSE file and https://mariadb.com/bsl11/
 */

import { PlanAAgreementContent } from "@/renderer/components/PlanAAgreementContent"
import { Button } from "@/renderer/components/ui/button"
import { Checkbox } from "@/renderer/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/renderer/components/ui/dialog"
import { Label } from "@/renderer/components/ui/label"
import { cn } from "@/renderer/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"

const SCROLL_THRESHOLD = 16

interface PlanAConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

function isScrolledToBottom(element: HTMLDivElement) {
	return (
		element.scrollHeight - element.scrollTop - element.clientHeight <=
		SCROLL_THRESHOLD
	)
}

export function PlanAConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
}: PlanAConfirmDialogProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false)
	const [hasAgreed, setHasAgreed] = useState(false)
	const [hasConfirmedQmtReady, setHasConfirmedQmtReady] = useState(false)

	const updateScrollState = useCallback(() => {
		const element = scrollRef.current
		if (!element) return
		setHasScrolledToEnd(isScrolledToBottom(element))
	}, [])

	useEffect(() => {
		if (!open) {
			setHasScrolledToEnd(false)
			setHasAgreed(false)
			setHasConfirmedQmtReady(false)
			return
		}

		const element = scrollRef.current
		if (element) {
			element.scrollTop = 0
		}

		requestAnimationFrame(updateScrollState)
	}, [open, updateScrollState])

	const canConfirm = hasScrolledToEnd && hasAgreed && hasConfirmedQmtReady

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="z-[70] gap-0 overflow-hidden p-0 sm:max-w-[520px]"
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => {
					e.stopPropagation()
					onOpenChange(false)
				}}
			>
				<DialogHeader className="space-y-2 border-b px-6 py-5 text-center sm:text-center">
					<DialogTitle className="text-base">
						《交易模式切换说明》
					</DialogTitle>
					<DialogDescription>
						切换至券商特邀模式前，请仔细阅读以下说明
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-4">
					<div
						ref={scrollRef}
						onScroll={updateScrollState}
						className="h-[320px] overflow-y-auto rounded-lg border bg-muted/30 px-4 py-3 shadow-inner"
					>
						<PlanAAgreementContent />
					</div>
				</div>

				<div className="space-y-3 border-t bg-muted/10 px-6 py-4">
					<p
						className={cn(
							"text-center text-xs",
							hasScrolledToEnd
								? "text-muted-foreground"
								: "text-amber-600 dark:text-amber-500",
						)}
					>
						{hasScrolledToEnd
							? "您已阅读至说明末尾，请勾选同意后继续"
							: "请滑动至底部查阅完整说明"}
					</p>

					<div className="flex items-start gap-3 rounded-md border bg-background px-3 py-3">
						<Checkbox
							id="plan-a-agreement"
							checked={hasAgreed}
							disabled={!hasScrolledToEnd}
							onCheckedChange={(checked) => setHasAgreed(checked === true)}
							className="mt-0.5"
						/>
						<Label
							htmlFor="plan-a-agreement"
							className={cn(
								"text-sm leading-snug",
								hasScrolledToEnd
									? "cursor-pointer font-medium"
									: "cursor-not-allowed text-muted-foreground",
							)}
						>
							我已阅读并理解《交易模式切换说明》
						</Label>
					</div>

					<div className="flex items-start gap-3 rounded-md border bg-background px-3 py-3">
						<Checkbox
							id="plan-a-qmt-ready"
							checked={hasConfirmedQmtReady}
							disabled={!hasScrolledToEnd}
							onCheckedChange={(checked) =>
								setHasConfirmedQmtReady(checked === true)
							}
							className="mt-0.5"
						/>
						<Label
							htmlFor="plan-a-qmt-ready"
							className={cn(
								"text-sm leading-snug",
								hasScrolledToEnd
									? "cursor-pointer font-medium"
									: "cursor-not-allowed text-muted-foreground",
							)}
						>
							我确认已完成大 QMT 相关配置，并已确保 QMT 连接正常
						</Label>
					</div>
				</div>

				<DialogFooter className="gap-3 border-t px-6 py-4 sm:justify-center">
					<Button
						variant="outline"
						className="min-w-[120px]"
						onClick={() => onOpenChange(false)}
					>
						暂不切换
					</Button>
					<Button
						className="min-w-[160px]"
						disabled={!canConfirm}
						onClick={onConfirm}
					>
						我已理解，确认切换
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
