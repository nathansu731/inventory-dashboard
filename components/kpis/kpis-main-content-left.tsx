import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type React from "react"

type KpiRow = {
    sku: string
    store: string
    abcClass: string
    forecastMethod: string
}

type KpisMainContentLeftProps = {
    rows: KpiRow[]
    isLoading: boolean
}

export const KpisMainContentLeft = ({ rows, isLoading }: KpisMainContentLeftProps) => {
    return (
        <div className="w-1/3 border-r bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">SKU Metadata</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)] !overflow-x-auto">
                <Table className="min-w-max table-auto !overflow-x-auto">
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-[140px]">SKU</TableHead>
                            <TableHead className="w-[140px]">Store</TableHead>
                            <TableHead className="w-[80px]">ABC Class</TableHead>
                            <TableHead>Forecast Method</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow className="h-12">
                                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                                    Loading KPI data...
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && rows.map((item, index) => (
                            <TableRow key={index} className="h-12">
                                <TableCell className="font-medium text-sm">
                                    {item.sku}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                    {item.store}
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {item.abcClass}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {item.forecastMethod}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && rows.length === 0 && (
                            <TableRow className="h-12">
                                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                                    No KPI data available.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}
