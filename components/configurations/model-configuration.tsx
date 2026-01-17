import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {BarChart3, Target} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {Config} from "@/components/configurations/configurations-types";

type ModelConfigurationProps = {
    config: Config;
    handleConfigChange: <K extends keyof Config>(key: K, value: Config[K]) => void;
}

export const ModelConfiguration = ({config, handleConfigChange}: ModelConfigurationProps) => {
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <CardTitle>Model Configuration</CardTitle>
                </div>
                <CardDescription>Advanced settings for forecast model behavior</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="model-type">Model Type</Label>
                            <Select value={config.modelType} onValueChange={(value) => handleConfigChange("modelType", value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="arima">ARIMA</SelectItem>
                                    <SelectItem value="exponential">Exponential Smoothing</SelectItem>
                                    <SelectItem value="linear">Linear Regression</SelectItem>
                                    <SelectItem value="ensemble">Ensemble Model</SelectItem>
                                    <SelectItem value="neural">Neural Network</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="seasonality">Seasonality Detection</Label>
                            <Select
                                value={config.seasonalityDetection}
                                onValueChange={(value) => handleConfigChange("seasonalityDetection", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto-detect</SelectItem>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confidence-interval">Confidence Interval (%)</Label>
                            <Select
                                value={config.confidenceInterval.toString()}
                                onValueChange={(value) => handleConfigChange("confidenceInterval", Number.parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="80">80%</SelectItem>
                                    <SelectItem value="90">90%</SelectItem>
                                    <SelectItem value="95">95%</SelectItem>
                                    <SelectItem value="99">99%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="outlier-detection" className="text-sm font-medium">
                                    Outlier Detection
                                </Label>
                                <p className="text-xs text-muted-foreground">Automatically detect and handle outliers</p>
                            </div>
                            <Switch
                                id="outlier-detection"
                                checked={config.outlierDetection}
                                onCheckedChange={(checked) => handleConfigChange("outlierDetection", checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="trend-damping" className="text-sm font-medium">
                                    Trend Damping
                                </Label>
                                <p className="text-xs text-muted-foreground">Apply damping to long-term trends</p>
                            </div>
                            <Switch
                                id="trend-damping"
                                checked={config.trendDamping}
                                onCheckedChange={(checked) => handleConfigChange("trendDamping", checked)}
                            />
                        </div>

                        <div className="rounded-lg border p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Current Configuration</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{config.modelType}</Badge>
                                <Badge variant="secondary">{config.dataFrequency}</Badge>
                                <Badge variant="secondary">{config.confidenceInterval}% CI</Badge>
                                {config.outlierDetection && <Badge variant="secondary">Outlier Detection</Badge>}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
