import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Calendar, Clock} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Config} from "@/components/configurations/configurations-types";

type ForecastParametersProps = {
    config: Config
    handleConfigChange: (key: string, value: any) => void;
}

export const ForecastParameters = ({config, handleConfigChange}: ForecastParametersProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <CardTitle>Forecast Parameters</CardTitle>
                </div>
                <CardDescription>Set the time range and initial conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="forecast-start">Forecast Start Date</Label>
                    <div className="relative">
                        <Input
                            id="forecast-start"
                            type="date"
                            value={config.forecastStartDate}
                            onChange={(e) => handleConfigChange("forecastStartDate", e.target.value)}
                        />
                        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="forecast-horizon">Forecast Horizon (days)</Label>
                    <Input
                        id="forecast-horizon"
                        type="number"
                        min="1"
                        max="365"
                        value={config.forecastHorizon}
                        onChange={(e) => handleConfigChange("forecastHorizon", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Number of periods to forecast into the future</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="initial-consensus">Initial Consensus</Label>
                    <Input
                        id="initial-consensus"
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.initialConsensus}
                        onChange={(e) => handleConfigChange("initialConsensus", Number.parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Default consensus value for all records (0.0 - 1.0)</p>
                </div>
            </CardContent>
        </Card>
    )
}