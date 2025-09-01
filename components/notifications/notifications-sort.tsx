import {Button} from "@/components/ui/button";
import {ChevronDown, Filter, Trash2} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import React from "react";
import {Notification} from "./notifications-types"

type SortOption = "newest" | "oldest" | "unread" | "priority"

type NotificationsSortProps = {
    clearCompletedJobs: () => void,
    completedJobsCount: number,
    clearAll: () => void,
    notifications: Notification[],
    sortBy: SortOption,
    setSortBy: React.Dispatch<React.SetStateAction<SortOption>>;
}

export const NotificationsSort = ({ clearCompletedJobs, completedJobsCount, clearAll, notifications, sortBy, setSortBy }: NotificationsSortProps) => {
    return (
        <div className="mb-6 p-4 border rounded-lg">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCompletedJobs}
                        disabled={completedJobsCount === 0}
                        className="flex items-center gap-2 bg-transparent"
                    >
                        <Trash2 className="h-4 w-4"/>
                        Clear Completed Jobs ({completedJobsCount})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        disabled={notifications.length === 0}
                        className="flex items-center gap-2 bg-transparent"
                    >
                        <Trash2 className="h-4 w-4"/>
                        Clear All
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