type ForecastingSummaryFooterProps = {
    totalItems: number
    visibleItems: number
    selectedItems: string[]
}

export const ForecastingSummaryFooter = ({ totalItems, visibleItems, selectedItems }: ForecastingSummaryFooterProps) => {
    return (
        <div className="mt-4 text-sm text-muted-foreground">
            Showing {visibleItems} of {totalItems} items
            {selectedItems.length > 0 && (
                <span className="ml-4">
                    {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
                </span>
            )}
        </div>
    )
}
