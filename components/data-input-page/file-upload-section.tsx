import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {FileText, Upload} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Progress} from "@/components/ui/progress";
import type React from "react";

type FileUploadSectionProps = {
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void,
    uploadedFile: File | null,
    isProcessing: boolean,
    uploadProgress: number,
}

export const FileUploadSection = ({handleFileUpload, uploadedFile, isProcessing, uploadProgress}: FileUploadSectionProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    File Upload
                </CardTitle>
                <CardDescription>Upload your data files for forecasting analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Drop files here or click to browse</p>
                        <p className="text-xs text-muted-foreground">Supports CSV, Excel, JSON files up to 50MB</p>
                    </div>
                    <Input
                        type="file"
                        className="hidden"
                        id="file-upload"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={handleFileUpload}
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                        <Button variant="outline" className="mt-4 bg-transparent">
                            Choose Files
                        </Button>
                    </Label>
                </div>

                {uploadedFile && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                                <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <Badge variant={isProcessing ? "secondary" : "default"}>
                                {isProcessing ? "Processing" : "Ready"}
                            </Badge>
                        </div>

                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Processing...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} className="h-2" />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}