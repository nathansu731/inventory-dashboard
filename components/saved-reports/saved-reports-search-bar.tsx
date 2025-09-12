import {Download, Search, Trash2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React from "react";

type SavedReportsSearchBarProps = {
    searchTerm: string,
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>,
    selectedReports: number[],
    handleBulkDownload: () => void,
    handleBulkDelete: () => void
}

export const SavedReportsSearchBar = ({searchTerm, setSearchTerm, selectedReports, handleBulkDownload, handleBulkDelete}: SavedReportsSearchBarProps) => {
    return (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center px-6">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"/>
                <Input
                    placeholder="Search reports by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            {selectedReports.length > 0 && (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDownload}
                        className="flex items-center gap-2 bg-transparent"
                    >
                        <Download className="h-4 w-4"/>
                        Download ({selectedReports.length})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-transparent"
                    >
                        <Trash2 className="h-4 w-4"/>
                        Delete ({selectedReports.length})
                    </Button>
                </div>
            )}
        </div>
    )
}
