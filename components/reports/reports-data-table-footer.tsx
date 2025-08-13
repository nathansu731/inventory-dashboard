import {reportData} from "@/components/reports/reports-data";
import {Button} from "@/components/ui/button";

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

type ReportsDataTableFooterProps = {
    filteredData: FilteredData[]
}

export const ReportsDataTableFooter = ({filteredData}: ReportsDataTableFooterProps) => {
    return (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
                Showing {filteredData.length} of {reportData.length} results
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                    Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                    Next
                </Button>
            </div>
        </div>
    )
}