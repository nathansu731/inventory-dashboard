import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {Check, Eye, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";

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

type ForecastingSummaryTableProps = {
    forecastData: ForecastDataItem[];
    selectedItems: string[];
    selectAll: boolean;
    handleSelectAll: (checked: boolean) => void;
    handleSelectItem: (id: string, checked: boolean) => void;
    columnVisibility: ColumnVisibility;
};

// below component is original one, without lazy loading ----- /////

export function ForecastingSummaryTable({forecastData, selectedItems, selectAll, handleSelectAll, handleSelectItem, columnVisibility}: ForecastingSummaryTableProps) {
    return (
        <div className="rounded-md border">
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
                <TableBody>
                    {forecastData.map((item) => (
                        <TableRow key={item.id}>
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
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}