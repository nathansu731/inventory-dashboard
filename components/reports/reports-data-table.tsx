import { useRef, useEffect, useCallback } from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

type SelectedColumns = {
    date: boolean;
    region: boolean;
    product: boolean;
    revenue: boolean;
    forecast: boolean;
    accuracy: boolean;
    variance: boolean;
    status: boolean;
}

type FilteredData = {
    id: number;
    date: string;
    region: string;
    product: string;
    revenue: number;
    forecast: string;
    accuracy: number;
    variance: number;
    status: string;
}

type ReportsDataTableProps = {
    selectedColumns: SelectedColumns;
    filteredData: FilteredData[];
    loadMore: () => void;
}

export const ReportsDataTable = ({selectedColumns, filteredData, loadMore}: ReportsDataTableProps) => {
    const lastRowRef = useRef<HTMLTableRowElement | null>(null);

    const observer = useRef<IntersectionObserver | null>(null);

    const observeLastRow = useCallback((node: HTMLTableRowElement | null) => {
        if (observer.current) observer.current.disconnect();
        if (!node) return;

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        }, { threshold: 1.0 });

        observer.current.observe(node);
    }, [loadMore]);

    useEffect(() => {
        if (lastRowRef.current) {
            observeLastRow(lastRowRef.current);
        }
    }, [filteredData, observeLastRow]);

    return (
        <div className="border rounded-lg" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {selectedColumns.date && <TableHead>Date</TableHead>}
                        {selectedColumns.region && <TableHead>Region</TableHead>}
                        {selectedColumns.product && <TableHead>Product</TableHead>}
                        {selectedColumns.revenue && <TableHead className="text-right">Revenue</TableHead>}
                        {selectedColumns.forecast && <TableHead>Forecast Method</TableHead>}
                        {selectedColumns.accuracy && <TableHead className="text-right">Accuracy (%)</TableHead>}
                        {selectedColumns.variance && <TableHead className="text-right">Variance (%)</TableHead>}
                        {selectedColumns.status && <TableHead>Status</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((row, index) => {
                        const isLast = index === filteredData.length - 1;
                        return (
                            <TableRow
                                key={row.id}
                                ref={isLast ? lastRowRef : null}
                            >
                                {selectedColumns.date && <TableCell className="font-medium">{row.date}</TableCell>}
                                {selectedColumns.region && <TableCell>{row.region}</TableCell>}
                                {selectedColumns.product && <TableCell>{row.product}</TableCell>}
                                {selectedColumns.revenue && (
                                    <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                                )}
                                {selectedColumns.forecast && <TableCell>{row.forecast}</TableCell>}
                                {selectedColumns.accuracy && <TableCell className="text-right">{row.accuracy}%</TableCell>}
                                {selectedColumns.variance && <TableCell className="text-right">{row.variance}%</TableCell>}
                                {selectedColumns.status && (
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                row.status === "Completed"
                                                    ? "bg-green-100 text-green-800"
                                                    : row.status === "In Progress"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                            }`}
                                        >
                                            {row.status}
                                        </span>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};