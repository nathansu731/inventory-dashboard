import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {CalendarIcon, Check, ChevronsUpDown, Download, Filter, Printer, Save, Share} from "lucide-react";
import {format} from "date-fns";
import {Calendar} from "@/components/ui/calendar";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Checkbox} from "@/components/ui/checkbox";
import React from "react";

type ColumnFilters = {
    region: string[];
    product: string[];
    forecast: string[];
    status: string[];
}

type UniqueValues = {
    region: string[];
    product: string[];
    forecast: string[];
    status: string[];
}

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

type ReportsControlRowProps = {
    date: Date | undefined;
    setDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
    filterOpen: boolean;
    setFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
    columnFilters: ColumnFilters;
    setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFilters>>;
    uniqueValues: UniqueValues;
    handleFilterToggle: (column: keyof ColumnFilters, value: string) => void;
    selectedColumns: SelectedColumns;
    handleColumnToggle: (column: keyof SelectedColumns) => void;
    exportToCSV: () => void;
}

export const ReportsControlRow = ({date, setDate, filterOpen, setFilterOpen, columnFilters, uniqueValues, handleFilterToggle, selectedColumns, handleColumnToggle, exportToCSV}: ReportsControlRowProps) => {
    return (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-start justify-between mb-6">
            <div className="flex flex-wrap gap-4 items-center">
                {/* Report Type Dropdown */}
                <Select defaultValue="forecast">
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Report Type"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="forecast">Forecast Reports</SelectItem>
                        <SelectItem value="performance">Performance Reports</SelectItem>
                        <SelectItem value="accuracy">Accuracy Reports</SelectItem>
                        <SelectItem value="variance">Variance Reports</SelectItem>
                    </SelectContent>
                </Select>

                {/* Category Dropdown */}
                <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="demand">Demand</SelectItem>
                    </SelectContent>
                </Select>

                {/* Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline"
                                className="w-[160px] justify-start text-left font-normal bg-transparent">
                            <CalendarIcon className="mr-2 h-4 w-4"/>
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus/>
                    </PopoverContent>
                </Popover>

                {/* Filter Button */}
                <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4"/>
                            Filters
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Filter Options</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                            {/* Column Filters */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Filter by Column Values</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Region Filter */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">Region</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline"
                                                        className="w-full justify-between bg-transparent">
                                                    {columnFilters.region.length > 0
                                                        ? `${columnFilters.region.length} selected`
                                                        : "Select regions..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search regions..."/>
                                                    <CommandList>
                                                        <CommandEmpty>No regions found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueValues.region.map((region) => (
                                                                <CommandItem key={region}
                                                                             onSelect={() => handleFilterToggle("region", region)}>
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${
                                                                            columnFilters.region.includes(region) ? "opacity-100" : "opacity-0"
                                                                        }`}
                                                                    />
                                                                    {region}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {columnFilters.region.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {columnFilters.region.map((region) => (
                                                    <Badge key={region} variant="secondary" className="text-xs">
                                                        {region}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Filter */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">Product</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline"
                                                        className="w-full justify-between bg-transparent">
                                                    {columnFilters.product.length > 0
                                                        ? `${columnFilters.product.length} selected`
                                                        : "Select products..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search products..."/>
                                                    <CommandList>
                                                        <CommandEmpty>No products found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueValues.product.map((product) => (
                                                                <CommandItem key={product}
                                                                             onSelect={() => handleFilterToggle("product", product)}>
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${
                                                                            columnFilters.product.includes(product) ? "opacity-100" : "opacity-0"
                                                                        }`}
                                                                    />
                                                                    {product}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {columnFilters.product.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {columnFilters.product.map((product) => (
                                                    <Badge key={product} variant="secondary" className="text-xs">
                                                        {product}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Forecast Method Filter */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">Forecast
                                            Method</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline"
                                                        className="w-full justify-between bg-transparent">
                                                    {columnFilters.forecast.length > 0
                                                        ? `${columnFilters.forecast.length} selected`
                                                        : "Select forecast methods..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search methods..."/>
                                                    <CommandList>
                                                        <CommandEmpty>No methods found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueValues.forecast.map((method) => (
                                                                <CommandItem key={method}
                                                                             onSelect={() => handleFilterToggle("forecast", method)}>
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${
                                                                            columnFilters.forecast.includes(method) ? "opacity-100" : "opacity-0"
                                                                        }`}
                                                                    />
                                                                    {method}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {columnFilters.forecast.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {columnFilters.forecast.map((method) => (
                                                    <Badge key={method} variant="secondary" className="text-xs">
                                                        {method}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline"
                                                        className="w-full justify-between bg-transparent">
                                                    {columnFilters.status.length > 0
                                                        ? `${columnFilters.status.length} selected`
                                                        : "Select statuses..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search statuses..."/>
                                                    <CommandList>
                                                        <CommandEmpty>No statuses found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {uniqueValues.status.map((status) => (
                                                                <CommandItem key={status}
                                                                             onSelect={() => handleFilterToggle("status", status)}>
                                                                    <Check
                                                                        className={`mr-2 h-4 w-4 ${
                                                                            columnFilters.status.includes(status) ? "opacity-100" : "opacity-0"
                                                                        }`}
                                                                    />
                                                                    {status}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {columnFilters.status.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {columnFilters.status.map((status) => (
                                                    <Badge key={status} variant="secondary" className="text-xs">
                                                        {status}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Separator/>

                            {/* Pre-defined Date Ranges */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Pre-defined Date Ranges</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm">
                                        Last 7 days
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Last 30 days
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Last 3 months
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Last 6 months
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        This year
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Last year
                                    </Button>
                                </div>
                            </div>

                            <Separator/>

                            {/* Column Visibility */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Visible Columns</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.keys(selectedColumns) as Array<keyof typeof selectedColumns>).map((column) => (
                                        <div key={column} className="flex items-center space-x-2">
                                            <Checkbox id={column} checked={selectedColumns[column]}
                                                      onCheckedChange={() => handleColumnToggle(column)}/>
                                            <Label htmlFor={column} className="text-sm capitalize">
                                                {column.replace(/([A-Z])/g, " $1").trim()}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Right-aligned Action Buttons */}
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="mr-2 h-4 w-4"/>
                    Export
                </Button>
                <Button variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4"/>
                    Print
                </Button>
                <Button variant="outline" size="sm">
                    <Share className="mr-2 h-4 w-4"/>
                    Share
                </Button>
                <Button variant="outline" size="sm">
                    <Save className="mr-2 h-4 w-4"/>
                    Save
                </Button>
            </div>
        </div>
    )
}