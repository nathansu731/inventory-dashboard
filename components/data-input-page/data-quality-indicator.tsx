"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DataQualityIndicatorProps = {
    uploadedFile: File | null
    isProcessing: boolean
}

type Assessment = {
    completeness: number
    dateIssueCount: number | null
    rows: number
    columns: number
}

const parseCsvLine = (line: string) => {
    const values: string[] = []
    let value = ""
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index]
        if (character === '"') {
            if (inQuotes && line[index + 1] === '"') {
                value += '"'
                index += 1
            } else {
                inQuotes = !inQuotes
            }
        } else if (character === "," && !inQuotes) {
            values.push(value.trim())
            value = ""
        } else {
            value += character
        }
    }
    values.push(value.trim())
    return values
}

const isValidDate = (value: string) => {
    if (!value) return false
    const dayFirst = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (dayFirst) {
        const date = new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]))
        return date.getFullYear() === Number(dayFirst[3]) && date.getMonth() === Number(dayFirst[2]) - 1 && date.getDate() === Number(dayFirst[1])
    }
    const parsed = new Date(value)
    return Number.isFinite(parsed.getTime())
}

export const DataQualityIndicator = ({ uploadedFile, isProcessing }: DataQualityIndicatorProps) => {
    const [assessment, setAssessment] = useState<Assessment | null>(null)

    useEffect(() => {
        let cancelled = false
        setAssessment(null)
        if (!uploadedFile) return

        void uploadedFile.text().then((raw) => {
            if (cancelled) return
            const lines = raw.split(/\r?\n/).filter((line) => line.trim())
            const headers = parseCsvLine(lines[0] ?? "")
            const rows = lines.slice(1).map(parseCsvLine)
            const expectedCells = rows.length * headers.length
            const populatedCells = rows.reduce(
                (total, row) => total + headers.reduce((count, _, index) => count + (row[index]?.trim() ? 1 : 0), 0),
                0,
            )
            const dateIndex = headers.findIndex((header) => /date|day|period/i.test(header))
            const dateIssueCount = dateIndex < 0
                ? null
                : rows.reduce((count, row) => count + (row[dateIndex]?.trim() && !isValidDate(row[dateIndex]) ? 1 : 0), 0)

            setAssessment({
                completeness: expectedCells > 0 ? (populatedCells / expectedCells) * 100 : 0,
                dateIssueCount,
                rows: rows.length,
                columns: headers.length,
            })
        })

        return () => {
            cancelled = true
        }
    }, [uploadedFile])

    if (!uploadedFile || isProcessing) return null

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Data Quality Assessment
                </CardTitle>
                <CardDescription>Checks calculated from the uploaded CSV before forecasting</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="text-sm font-medium">Data Completeness</p>
                            <p className="text-xs text-muted-foreground">
                                {assessment ? `${assessment.completeness.toFixed(1)}% populated cells` : "Checking uploaded file..."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/20">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div>
                            <p className="text-sm font-medium">Date Consistency</p>
                            <p className="text-xs text-muted-foreground">
                                {!assessment ? "Checking uploaded file..." : assessment.dateIssueCount === null ? "No date field detected" : assessment.dateIssueCount === 0 ? "No invalid date values found" : `${assessment.dateIssueCount} invalid date value${assessment.dateIssueCount === 1 ? "" : "s"}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                        <Info className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium">Data Shape</p>
                            <p className="text-xs text-muted-foreground">
                                {assessment ? `${assessment.rows.toLocaleString()} rows, ${assessment.columns} columns` : "Checking uploaded file..."}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
