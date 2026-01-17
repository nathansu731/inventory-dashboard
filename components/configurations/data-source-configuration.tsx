import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Database} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Config} from "@/components/configurations/configurations-types";

type DataSourceConfigurationProps = {
    config: Config;
    handleConfigChange: <K extends keyof Config>(key: K, value: Config[K]) => void;
}

export const DataSourceConfiguration = ({config, handleConfigChange}: DataSourceConfigurationProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <CardTitle>Data Source Configuration</CardTitle>
                </div>
                <CardDescription>Configure how data is processed for forecasting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="compute-aggregation" className="text-sm font-medium">
                            Compute from aggregation
                        </Label>
                        <p className="text-xs text-muted-foreground">Use aggregated data points for forecast calculations</p>
                    </div>
                    <Switch
                        id="compute-aggregation"
                        checked={config.computeFromAggregation}
                        onCheckedChange={(checked) => handleConfigChange("computeFromAggregation", checked)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="data-frequency">Data Frequency</Label>
                    <Select
                        value={config.dataFrequency}
                        onValueChange={(value) => handleConfigChange("dataFrequency", value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="min-history">Minimum History Periods</Label>
                    <Input
                        id="min-history"
                        type="number"
                        min="1"
                        value={config.minHistoryPeriods}
                        onChange={(e) => handleConfigChange("minHistoryPeriods", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                        Minimum number of historical periods required for forecasting
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
