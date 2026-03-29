import {Button} from "@/components/ui/button";
import {ChevronDown, Filter, Trash2} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import React from "react";

type SortOption = "newest" | "oldest" | "unread" | "priority"

type NotificationsSortProps = {
    onClearCompleted: () => void,
    onMarkAllRead: () => void,
    clearCompletedDisabled: boolean,
    markAllReadDisabled: boolean,
    actionLoading: boolean,
    sortBy: SortOption,
    setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
}

export const NotificationsSort = ({
    onClearCompleted,
    onMarkAllRead,
    clearCompletedDisabled,
    markAllReadDisabled,
    actionLoading,
    sortBy,
    setSortBy,
}: NotificationsSortProps) => {
    return (
        <div className="mb-6 p-4 border rounded-lg">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onMarkAllRead}
                        disabled={markAllReadDisabled || actionLoading}
                        className="bg-transparent"
                    >
                        Mark All Read
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearCompleted}
                        disabled={clearCompletedDisabled || actionLoading}
                        className="bg-transparent"
                    >
                        <Trash2 className="h-4 w-4 mr-2"/>
                        Clear Completed
                    </Button>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                            <Filter className="h-4 w-4"/>
                            Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                            <ChevronDown className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("unread")}>Unread First</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortBy("priority")}>Priority</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
