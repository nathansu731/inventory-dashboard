
type ForecastDataItem = {
    id: string;
    store: string;
    description: string;
    forecastMethod: string;
    abcClass: string;
    abcPercentage: number;
    approved: boolean;
};

type ForecastingSummaryFooterProps = {
    forecastData: ForecastDataItem[];
    selectedItems: string[];
};

export const ForecastingSummaryFooter = ({forecastData, selectedItems}: ForecastingSummaryFooterProps) => {
    return (
        <div className="mt-4 text-sm text-muted-foreground">
            Showing {forecastData.length} of {forecastData.length} items
            {selectedItems.length > 0 && (
                <span className="ml-4">
              {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
            </span>
            )}
        </div>
    )
}