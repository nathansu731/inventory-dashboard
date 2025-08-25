import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Settings} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type React from "react";


type DataSourceSelectionProps = {
    selectedSource: string,
    setSelectedSource: React.Dispatch<React.SetStateAction<string>>,
    selectedFormat: string,
    setSelectedFormat: React.Dispatch<React.SetStateAction<string>>,
}

export const DataSourceSelection = ({selectedSource, setSelectedSource, selectedFormat,setSelectedFormat }: DataSourceSelectionProps) => {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Data Source Configuration
                </CardTitle>
                <CardDescription>Select your data source and format preferences</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="data-source">Data Source</Label>
                        <Select value={selectedSource} onValueChange={setSelectedSource}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="csv">CSV File</SelectItem>
                                <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                                <SelectItem value="database">Database Connection</SelectItem>
                                <SelectItem value="api">API Endpoint</SelectItem>
                                <SelectItem value="cloud">Cloud Storage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="data-format">Data Format</Label>
                        <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="time-series">Time Series</SelectItem>
                                <SelectItem value="cross-sectional">Cross-sectional</SelectItem>
                                <SelectItem value="panel">Panel Data</SelectItem>
                                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="frequency">Data Frequency</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}