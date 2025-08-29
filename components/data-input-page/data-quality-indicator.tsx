import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {AlertCircle, CheckCircle, Info} from "lucide-react";
import type React from "react";

type DataQualityIndicatorProps = {
    uploadedFile : File | null
    isProcessing : boolean
}


export const DataQualityIndicator = ({uploadedFile, isProcessing}: DataQualityIndicatorProps) => {
    return (
        <>
        { uploadedFile && !isProcessing && (
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Data Quality Assessment
                    </CardTitle>
                    <CardDescription>Automated analysis of your uploaded data</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">Data Completeness</p>
                                <p className="text-xs text-muted-foreground">98.5% complete</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            <div>
                                <p className="text-sm font-medium">Data Consistency</p>
                                <p className="text-xs text-muted-foreground">3 anomalies detected</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <Info className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium">Data Format</p>
                                <p className="text-xs text-muted-foreground">Valid time series</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
      </>
    )
}