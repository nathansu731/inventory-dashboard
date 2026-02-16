import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type React from "react"

type DataConfigurationProps = {
    plan: string
    model: string
    setModel: React.Dispatch<React.SetStateAction<string>>
    mode: string
    setMode: React.Dispatch<React.SetStateAction<string>>
    seasonality: string
    setSeasonality: React.Dispatch<React.SetStateAction<string>>
    availableModels: string[]
    allowGlobal: boolean
}

export const DataConfiguration = ({
    plan,
    model,
    setModel,
    mode,
    setMode,
    seasonality,
    setSeasonality,
    availableModels,
    allowGlobal,
}: DataConfigurationProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Data Configuration
                </CardTitle>
                <CardDescription>Configure date ranges and data parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input type="date" id="start-date" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input type="date" id="end-date" />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="target-variable">Target Variable</Label>
                    <Input id="target-variable" placeholder="e.g., sales, revenue, demand" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Data Description</Label>
                    <Textarea id="description" placeholder="Describe your dataset and forecasting objectives..." rows={3} />
                </div>

                <Separator />

                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Forecasting Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Plan</Label>
                            <div className="text-sm text-muted-foreground capitalize">{plan || "free"}</div>
                        </div>
                        <div className="space-y-2">
                            <Label>Mode</Label>
                            <Select value={mode} onValueChange={setMode} disabled={!allowGlobal}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">Local</SelectItem>
                                    <SelectItem value="global" disabled={!allowGlobal}>
                                        Global (Pro)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Seasonality</Label>
                            <Select value={seasonality} onValueChange={setSeasonality}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Auto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Processing Options</h4>
                    <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>Auto-detect date columns</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span>Handle missing values</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Remove outliers</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm">
                            <input type="checkbox" className="rounded" />
                            <span>Apply seasonal adjustment</span>
                        </label>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
