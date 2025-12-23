import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {Check, Eye, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {useRef, useEffect} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";

type ForecastDataItem = {
    id: string;
    store: string;
    description: string;
    forecastMethod: string;
    abcClass: string;
    abcPercentage: number;
    approved: boolean;
};

type ColumnVisibility = {
    select: boolean;
    view: boolean;
    approved: boolean;
    skuId: boolean;
    store: boolean;
    description: boolean;
    forecastMethod: boolean;
    abcClass: boolean;
    abcPercentage: boolean;
};

type ForecastingSummaryTableLazyProps = {
    forecastData: ForecastDataItem[];
    selectedItems: string[];
    selectAll: boolean;
    handleSelectAll: (checked: boolean) => void;
    handleSelectItem: (id: string, checked: boolean) => void;
    columnVisibility: ColumnVisibility;
    loadMoreItems: () => void;
};

export const ForecastingSummaryTableLazy = ({
                                            forecastData,
                                            selectedItems,
                                            selectAll,
                                            handleSelectAll,
                                            handleSelectItem,
                                            columnVisibility,
                                            loadMoreItems
                                        }: ForecastingSummaryTableLazyProps) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: forecastData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 10,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    useEffect(() => {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;
        if (lastItem.index >= forecastData.length - 5) {
            loadMoreItems();
        }
    }, [virtualItems, forecastData.length, loadMoreItems]);

    return (
        <div className="rounded-md border">
            <div ref={parentRef} style={{height: 'auto', overflow: 'auto'}}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columnVisibility.select && (
                                <TableHead className="w-12">
                                    <Checkbox checked={selectAll} onCheckedChange={handleSelectAll}
                                              aria-label="Select all"/>
                                </TableHead>
                            )}
                            {columnVisibility.view && <TableHead className="w-12">View</TableHead>}
                            {columnVisibility.approved && <TableHead className="w-20">Approved</TableHead>}
                            {columnVisibility.skuId && <TableHead>SKU/ID</TableHead>}
                            {columnVisibility.store && <TableHead>Store</TableHead>}
                            {columnVisibility.description && <TableHead>Description</TableHead>}
                            {columnVisibility.forecastMethod && <TableHead>Forecast Method</TableHead>}
                            {columnVisibility.abcClass && <TableHead>ABC Class</TableHead>}
                            {columnVisibility.abcPercentage && <TableHead className="text-right">ABC %</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody style={{height: rowVirtualizer.getTotalSize(), position: "relative"}}>
                        {virtualItems.map((virtualRow) => {
                            const item = forecastData[virtualRow.index];
                            if (!item) return null;
                            return (
                                <TableRow
                                    key={item.id}
                                >
                                    {columnVisibility.select && (
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedItems.includes(item.id)}
                                                onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                                                aria-label={`Select ${item.id}`}
                                            />
                                        </TableCell>
                                    )}
                                    {columnVisibility.view && (
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Eye className="h-4 w-4"/>
                                            </Button>
                                        </TableCell>
                                    )}
                                    {columnVisibility.approved && (
                                        <TableCell>
                                            {item.approved ? (
                                                <Check className="h-4 w-4 text-green-600"/>
                                            ) : (
                                                <X className="h-4 w-4 text-red-600"/>
                                            )}
                                        </TableCell>
                                    )}
                                    {columnVisibility.skuId && <TableCell className="font-medium">{item.id}</TableCell>}
                                    {columnVisibility.store && <TableCell>{item.store}</TableCell>}
                                    {columnVisibility.description && <TableCell>{item.description}</TableCell>}
                                    {columnVisibility.forecastMethod && (
                                        <TableCell>
                                            <Badge variant="secondary">{item.forecastMethod}</Badge>
                                        </TableCell>
                                    )}
                                    {columnVisibility.abcClass && (
                                        <TableCell>
                                            <Badge
                                                variant={item.abcClass === "A" ? "default" : item.abcClass === "B" ? "secondary" : "outline"}
                                            >
                                                {item.abcClass}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    {columnVisibility.abcPercentage && (
                                        <TableCell className="text-right font-medium">{item.abcPercentage}%</TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}