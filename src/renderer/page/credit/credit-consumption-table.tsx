import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/renderer/components/ui/table"
import { cn } from "@/renderer/lib/utils"
import type { CreditConsumptionProduct } from "@/renderer/page/credit/credit-consumption-products"
import { useMemo } from "react"

interface CreditConsumptionTableProps {
	products: CreditConsumptionProduct[]
	searchQuery?: string
	className?: string
}

function filterProducts(
	products: CreditConsumptionProduct[],
	query: string,
): CreditConsumptionProduct[] {
	const keyword = query.trim().toLowerCase()
	if (!keyword) return products

	return products.filter(
		(product) =>
			product.displayName.toLowerCase().includes(keyword) ||
			product.name.toLowerCase().includes(keyword),
	)
}

export function CreditConsumptionTable({
	products,
	searchQuery = "",
	className,
}: CreditConsumptionTableProps) {
	const filteredProducts = useMemo(
		() => filterProducts(products, searchQuery),
		[products, searchQuery],
	)

	return (
		<div
			className={cn(
				"overflow-hidden overflow-y-auto rounded-lg border max-h-[min(420px,50vh)]",
				className,
			)}
		>
			<Table>
				<TableHeader className="sticky top-0 z-10 bg-background">
					<TableRow>
						<TableHead>数据名称</TableHead>
						<TableHead>产品名称</TableHead>
						<TableHead className="text-right">全量恢复（约）</TableHead>
						<TableHead className="text-right">增量更新（约）</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredProducts.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={4}
								className="h-24 text-center text-muted-foreground"
							>
								未找到匹配的数据产品
							</TableCell>
						</TableRow>
					) : (
						filteredProducts.map((product) => (
							<TableRow key={product.name}>
								<TableCell className="text-foreground text-nowrap">
									{product.displayName}
								</TableCell>
								<TableCell className="text-muted-foreground text-sm text-nowrap">
									{product.name}
								</TableCell>
								<TableCell className="text-right font-mono">
									{product.full}
								</TableCell>
								<TableCell className="text-right font-mono">
									{product.incremental}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	)
}
