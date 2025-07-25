import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Filter} from "lucide-react";


export const ForecastingSummaryDropdown = () => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start bg-transparent">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter by Store
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem>All Stores</DropdownMenuItem>
                <DropdownMenuItem>Store A</DropdownMenuItem>
                <DropdownMenuItem>Store B</DropdownMenuItem>
                <DropdownMenuItem>Store C</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}