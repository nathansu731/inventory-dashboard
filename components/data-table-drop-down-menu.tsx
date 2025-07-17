import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {IconChevronDown, IconLayoutColumns, IconPlus} from "@tabler/icons-react";
import * as React from "react";
import {Table} from "@tanstack/table-core";


type RowData = {
    header: string;
    type: string;
    id: number;
    status: string;
    target: string;
    limit: string;
    reviewer: string;
};

interface DropDownMenuElementProps {
    table: Table<RowData>;
}

export function DataTableDropDownMenu({ table }: DropDownMenuElementProps) {
    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <IconLayoutColumns/>
                        <span className="hidden lg:inline">Customize Columns</span>
                        <span className="lg:hidden">Columns</span>
                        <IconChevronDown/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {table
                        .getAllColumns()
                        .filter(
                            (column) =>
                                typeof column.accessorFn !== "undefined" &&
                                column.getCanHide()
                        )
                        .map((column) => {
                            return (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                >
                                    {column.id}
                                </DropdownMenuCheckboxItem>
                            )
                        })}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm">
                <IconPlus/>
                <span className="hidden lg:inline">Add Section</span>
            </Button>
        </div>
    )
}