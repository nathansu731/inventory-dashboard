"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {DataSourceSelection} from "@/components/data-input-page/data-source-selection";
import {FileUploadSection} from "@/components/data-input-page/file-upload-section";
import {DataConfiguration} from "@/components/data-input-page/data-configuration";
import {DataQualityIndicator} from "@/components/data-input-page/data-quality-indicator";

export const DataInputPage = () => {
    const [selectedSource, setSelectedSource] = useState("")
    const [selectedFormat, setSelectedFormat] = useState("")
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setUploadedFile(file)
            setIsProcessing(true)
            let progress = 0
            const interval = setInterval(() => {
                progress += 10
                setUploadProgress(progress)
                if (progress >= 100) {
                    clearInterval(interval)
                    setIsProcessing(false)
                }
            }, 200)
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Data Input</h1>
                    <p className="text-muted-foreground">Upload and configure your forecasting data sources</p>
                </div>
                <DataSourceSelection selectedSource={selectedSource} setSelectedSource={setSelectedSource} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat}/>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FileUploadSection handleFileUpload={handleFileUpload} uploadedFile={uploadedFile} isProcessing={isProcessing} uploadProgress={uploadProgress}/>
                    <DataConfiguration/>
                </div>
                <DataQualityIndicator uploadedFile={uploadedFile} isProcessing={isProcessing}/>
                <div className="flex justify-end gap-4 mt-8">
                    <Button variant="outline">Save Configuration</Button>
                    <Button disabled={!uploadedFile || isProcessing} className="min-w-32">
                        {isProcessing ? "Processing..." : "Start Forecasting"}
                    </Button>
                </div>
            </div>
        </div>
    )
}