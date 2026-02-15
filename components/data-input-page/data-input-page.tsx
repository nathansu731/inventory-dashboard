"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {DataSourceSelection} from "@/components/data-input-page/data-source-selection";
import {FileUploadSection} from "@/components/data-input-page/file-upload-section";
import {DataConfiguration} from "@/components/data-input-page/data-configuration";
import {DataQualityIndicator} from "@/components/data-input-page/data-quality-indicator";
import Link from "next/link";

type RunSummary = {
    runId?: string
    status?: string
    createdAt?: string
    updatedAt?: string
    message?: string
}

export const DataInputPage = () => {
    const [selectedSource, setSelectedSource] = useState("")
    const [selectedFormat, setSelectedFormat] = useState("")
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [runStatus, setRunStatus] = useState<RunSummary | null>(null)

    const processSelectedFile = (file: File) => {
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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            processSelectedFile(file)
        }
    }

    const handleFileDrop = (file: File) => {
        processSelectedFile(file)
    }

    const startForecasting = async () => {
        if (!uploadedFile) return
        setIsProcessing(true)
        setRunStatus(null)

        try {
            const uploadRes = await fetch("/api/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: uploadedFile.name,
                    contentType: uploadedFile.type || "text/csv",
                }),
            })

            if (!uploadRes.ok) {
                setRunStatus({ message: "Failed to get upload URL" })
                setIsProcessing(false)
                return
            }

            const { uploadUrl, s3Key, s3Bucket } = await uploadRes.json()

            const putRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": uploadedFile.type || "text/csv" },
                body: uploadedFile,
            })

            if (!putRes.ok) {
                setRunStatus({ message: "Upload failed" })
                setIsProcessing(false)
                return
            }

            setUploadProgress(100)

            const runRes = await fetch("/api/forecast/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    s3Bucket,
                    s3Key,
                    originalFilename: uploadedFile.name,
                }),
            })

            const runJson = await runRes.json()
            if (!runRes.ok || runJson?.status === "error") {
                setRunStatus({ message: "Failed to start forecast run" })
                setIsProcessing(false)
                return
            }

            setRunStatus({
                runId: runJson?.run?.runId,
                status: runJson?.run?.status || runJson?.status,
                createdAt: runJson?.run?.createdAt,
                updatedAt: runJson?.run?.updatedAt,
                message: runJson?.message,
            })
        } catch (err) {
            setRunStatus({ message: "Unexpected error starting forecast" })
        } finally {
            setIsProcessing(false)
        }
    }

    const formattedRunTime = useMemo(() => {
        if (!runStatus?.createdAt) return null
        const date = new Date(runStatus.createdAt)
        if (Number.isNaN(date.getTime())) return null
        return `${date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }, [runStatus?.createdAt])

    const statusLabel = (runStatus?.status || "").toUpperCase()
    const statusTone =
        statusLabel === "DONE"
            ? "bg-green-100 text-green-800"
            : statusLabel === "FAILED"
                ? "bg-red-100 text-red-800"
                : statusLabel === "RUNNING"
                    ? "bg-blue-100 text-blue-800"
                    : statusLabel
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Data Input</h1>
                    <p className="text-muted-foreground">Upload and configure your forecasting data sources</p>
                </div>
                <DataSourceSelection selectedSource={selectedSource} setSelectedSource={setSelectedSource} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat}/>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FileUploadSection handleFileUpload={handleFileUpload} handleFileDrop={handleFileDrop} uploadedFile={uploadedFile} isProcessing={isProcessing} uploadProgress={uploadProgress}/>
                    <DataConfiguration/>
                </div>
                <DataQualityIndicator uploadedFile={uploadedFile} isProcessing={isProcessing}/>
                <div className="flex justify-end gap-4 mt-8">
                    <Button variant="outline">Save Configuration</Button>
                    <Button disabled={!uploadedFile || isProcessing} className="min-w-32" onClick={startForecasting}>
                        {isProcessing ? "Processing..." : "Start Forecasting"}
                    </Button>
                </div>
                {runStatus && (
                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="text-sm font-semibold text-slate-900">Forecast run submitted</div>
                                {runStatus.runId && (
                                    <div className="text-xs text-muted-foreground">Run ID: {runStatus.runId}</div>
                                )}
                                {formattedRunTime && (
                                    <div className="text-xs text-muted-foreground">{formattedRunTime}</div>
                                )}
                                {runStatus.message && (
                                    <div className="text-xs text-muted-foreground">{runStatus.message}</div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {statusLabel && (
                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>
                                        {statusLabel.toLowerCase()}
                                    </span>
                                )}
                                <Button asChild size="sm" variant="outline" className="bg-transparent">
                                    <Link href="/notifications">Check the latest run status</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
