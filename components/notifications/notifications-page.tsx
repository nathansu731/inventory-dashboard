"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Bell,
    Briefcase,
    CreditCard,
    DatabaseZap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {NotificationsSort} from "@/components/notifications/notifications-sort";
import {NotificationsList} from "@/components/notifications/notifications-list";
import {NotificationsDetails} from "@/components/notifications/notifications-details";
import { Notification } from "./notifications-types"
import { useProfile } from "@/hooks/use-profile"
import { extractFailureReason, parseRunSummary } from "@/lib/run-status"

type NotificationRecord = {
    notificationId: string
    runId: string
    status: string
    createdAt?: string
    updatedAt?: string
    read?: boolean
    summary?: {
        totalSkus?: number
        rows?: number
        dateStart?: string
        dateEnd?: string
        sourceType?: string
        provider?: string
        sourceId?: string
        syncMode?: string
        selectedTables?: string[]
        message?: string
        runConfig?: Record<string, unknown>
        validation?: Record<string, unknown>
    } | null
}

type SortOption = "newest" | "oldest" | "unread" | "priority"

const formatLabel = (value: string) =>
    value
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())

const asString = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim()
        return trimmed || null
    }
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return null
}

const asNumber = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null)

const formatMetric = (value: number | null, fractionDigits = 2) =>
    value === null ? null : value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits })

export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextToken, setNextToken] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortOption>("newest")
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { profile } = useProfile()

    const mapNotification = useCallback((run: NotificationRecord, displayName: string): Notification => {
        const status = (run.status || "").toUpperCase()
        const jobStatus =
            status === "DONE"
                ? "completed"
                : status === "FAILED"
                    ? "failed"
                    : status === "RUNNING"
                        ? "in-progress"
                        : "pending"

        const summary = parseRunSummary(run.summary) || {}
        const sourceType = asString(summary.sourceType)
        const isConnectorNotification = sourceType === "connector"
        const failureReason = extractFailureReason(run.summary)
        const runConfig = (summary.runConfig && typeof summary.runConfig === "object" ? summary.runConfig : {}) as Record<string, unknown>
        const validation = (summary.validation && typeof summary.validation === "object" ? summary.validation : {}) as Record<string, unknown>
        const selectedModel = (validation.selectedModel && typeof validation.selectedModel === "object"
            ? validation.selectedModel
            : {}) as Record<string, unknown>
        const selectedModelMetrics = (selectedModel.metrics && typeof selectedModel.metrics === "object"
            ? selectedModel.metrics
            : {}) as Record<string, unknown>
        const executedModel = asString(runConfig.executedModel) || asString(selectedModel.model)
        const executedMode = asString(runConfig.executedMode) || asString(selectedModel.mode)
        const requestedTargetColumn = asString(runConfig.requestedTargetColumn)
        const resolvedTargetColumn = asString(runConfig.resolvedTargetColumn)
        const dateStart = asString(summary.dateStart)
        const dateEnd = asString(summary.dateEnd)
        const rows = typeof summary.rows === "number" ? summary.rows : null
        const totalSeries = typeof summary.totalSeries === "number" ? summary.totalSeries : null
        const totalSkus = typeof summary.totalSkus === "number" ? summary.totalSkus : null
        const detectedFrequency = asString(runConfig.detectedFrequency) || asString(validation.frequency)
        const smape = asNumber(selectedModelMetrics.smape)
        const mae = asNumber(selectedModelMetrics.mae)
        const rmse = asNumber(selectedModelMetrics.rmse)
        const summaryText =
            summary?.totalSkus && summary?.dateStart && summary?.dateEnd
                ? `Processed ${summary.totalSkus} SKUs (${summary.dateStart} to ${summary.dateEnd}).`
                : "Artifacts are being prepared."

        if (isConnectorNotification) {
            const provider = asString(summary.provider) || "connector"
            const syncMode = asString(summary.syncMode)
            const selectedTables = Array.isArray(summary.selectedTables)
                ? summary.selectedTables.map((value) => asString(value)).filter((value): value is string => Boolean(value))
                : []
            const connectorMessage = asString(summary.message) || (jobStatus === "failed" ? "Connector sync failed." : "Connector sync completed.")
            const connectorTitle =
                jobStatus === "failed"
                    ? `${formatLabel(provider)} Sync Failed`
                    : jobStatus === "completed"
                        ? `${formatLabel(provider)} Sync Completed`
                        : `${formatLabel(provider)} Sync Update`

            return {
                id: run.notificationId || run.runId,
                type: "connector",
                title: connectorTitle,
                message: connectorMessage,
                timestamp: new Date(run.updatedAt || run.createdAt || Date.now()),
                read: Boolean(run.read),
                jobStatus,
                priority: jobStatus === "failed" ? "high" : jobStatus === "in-progress" ? "medium" : "low",
                details: connectorMessage,
                detailItems: [
                    { label: "Provider", value: formatLabel(provider) },
                    ...(syncMode ? [{ label: "Sync Mode", value: formatLabel(syncMode) }] : []),
                    ...(asString(summary.sourceId) ? [{ label: "Source ID", value: asString(summary.sourceId) || "" }] : []),
                    ...(selectedTables.length > 0 ? [{ label: "Selected Tables", value: selectedTables.join(", ") }] : []),
                    ...(selectedTables.length > 0 ? [{ label: "Table Count", value: String(selectedTables.length) }] : []),
                ],
                relatedUser: displayName,
            }
        }

        const detailItems = [
            { label: "Run ID", value: run.runId },
            ...(executedModel ? [{ label: "Model", value: executedMode ? `${formatLabel(executedModel)} (${formatLabel(executedMode)})` : formatLabel(executedModel) }] : []),
            ...(detectedFrequency ? [{ label: "Frequency", value: formatLabel(detectedFrequency) }] : []),
            ...(resolvedTargetColumn || requestedTargetColumn
                ? [{ label: "Forecast Column", value: resolvedTargetColumn && requestedTargetColumn && resolvedTargetColumn !== requestedTargetColumn
                    ? `${resolvedTargetColumn} (requested ${requestedTargetColumn})`
                    : (resolvedTargetColumn || requestedTargetColumn || "") }]
                : []),
            ...(dateStart && dateEnd ? [{ label: "Date Range", value: `${dateStart} to ${dateEnd}` }] : []),
            ...(totalSkus !== null ? [{ label: "SKUs", value: String(totalSkus) }] : []),
            ...(totalSeries !== null ? [{ label: "Series", value: String(totalSeries) }] : []),
            ...(rows !== null ? [{ label: "Rows", value: rows.toLocaleString("en-US") }] : []),
            ...(smape !== null ? [{ label: "Validation sMAPE", value: `${formatMetric(smape)}%` }] : []),
            ...(mae !== null ? [{ label: "Validation MAE", value: formatMetric(mae) || "" }] : []),
            ...(rmse !== null ? [{ label: "Validation RMSE", value: formatMetric(rmse) || "" }] : []),
        ]

        const message =
            jobStatus === "completed"
                ? `Forecast job completed for ${displayName}. ${summaryText}`
                : jobStatus === "failed"
                    ? `Forecast job failed for ${displayName}${failureReason ? `: ${failureReason}` : ". Please retry."}`
                    : jobStatus === "in-progress"
                        ? `Forecast job is running for ${displayName}.`
                        : `Forecast job queued for ${displayName}.`

        const timestamp = new Date(run.updatedAt || run.createdAt || Date.now())

        return {
            id: run.notificationId || run.runId,
            type: "job",
            title:
                jobStatus === "completed"
                    ? "Forecast Run Completed"
                    : jobStatus === "failed"
                        ? "Forecast Run Failed"
                        : jobStatus === "in-progress"
                            ? "Forecast Run In Progress"
                            : "Forecast Run Queued",
            message,
            timestamp,
            read: Boolean(run.read),
            jobStatus,
            priority: jobStatus === "failed" ? "high" : jobStatus === "in-progress" ? "medium" : "low",
            details:
                jobStatus === "completed"
                    ? `${summaryText}${smape !== null ? ` Validation sMAPE: ${formatMetric(smape)}%.` : ""}`
                    : `Run ID: ${run.runId}${failureReason ? `\nReason: ${failureReason}` : ""}`,
            detailItems,
            relatedUser: displayName,
        }
    }, [])

    useEffect(() => {
        const loadNotifications = async () => {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/list-notifications?limit=10")
            if (!res.ok) {
                setLoading(false)
                setError("Failed to load notifications.")
                return
            }
            const payload = await res.json()
            const items: NotificationRecord[] = payload?.items ?? []
            const token = payload?.nextToken ?? null

            const displayName =
                profile?.name ||
                [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") ||
                profile?.email ||
                "your account"

            const mapped: Notification[] = items.map((run) => mapNotification(run, displayName))

            setNotifications(mapped)
            setNextToken(token)
            setHasMore(Boolean(token))
            setLoading(false)
        }

        loadNotifications()
    }, [mapNotification, profile])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !nextToken) return

        setLoading(true)
        setError(null)
        const res = await fetch(`/api/list-notifications?limit=10&nextToken=${encodeURIComponent(nextToken)}`)
        if (!res.ok) {
            setLoading(false)
            setError("Failed to load more notifications.")
            return
        }
        const payload = await res.json()
        const items: NotificationRecord[] = payload?.items ?? []
        const token = payload?.nextToken ?? null

        const displayName =
            profile?.name ||
            [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") ||
            profile?.email ||
            "your account"

        const mapped: Notification[] = items.map((run) => mapNotification(run, displayName))

        setNotifications((prev) => [...prev, ...mapped])
        setNextToken(token)
        setHasMore(Boolean(token))
        setLoading(false)
    }, [hasMore, loading, mapNotification, nextToken, profile])

    const sortedNotifications = [...notifications].sort((a, b) => {
        switch (sortBy) {
            case "newest":
                return b.timestamp.getTime() - a.timestamp.getTime()
            case "oldest":
                return a.timestamp.getTime() - b.timestamp.getTime()
            case "unread":
                if (a.read === b.read) return b.timestamp.getTime() - a.timestamp.getTime()
                return a.read ? 1 : -1
            case "priority":
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                const aPriority = priorityOrder[a.priority || "low"]
                const bPriority = priorityOrder[b.priority || "low"]
                if (aPriority === bPriority) return b.timestamp.getTime() - a.timestamp.getTime()
                return bPriority - aPriority
            default:
                return 0
        }
    })

    const markAsRead = async (id: string) => {
        setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
        await fetch("/api/mark-notification-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: id }),
        })
    }

    const handleNotificationClick = (notification: Notification) => {
        const openedNotification = notification.read ? notification : { ...notification, read: true }
        void markAsRead(notification.id)
        setSelectedNotification(openedNotification)
    }

    const markAllRead = async () => {
        if (actionLoading) return
        setActionLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/notifications/mark-all-read", { method: "POST" })
            if (!res.ok) throw new Error(`request_failed_${res.status}`)
            setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
            setSelectedNotification((prev) => (prev ? { ...prev, read: true } : prev))
        } catch {
            setError("Failed to mark all notifications as read.")
        } finally {
            setActionLoading(false)
        }
    }

    const clearCompleted = async () => {
        if (actionLoading) return
        setActionLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/notifications/clear-completed", { method: "POST" })
            if (!res.ok) throw new Error(`request_failed_${res.status}`)
            setNotifications((prev) => prev.filter((item) => item.jobStatus !== "completed"))
            if (selectedNotification?.jobStatus === "completed") {
                setSelectedNotification(null)
            }
        } catch {
            setError("Failed to clear completed notifications.")
        } finally {
            setActionLoading(false)
        }
    }

    const getNotificationIcon = (notification: Notification) => {
        switch (notification.type) {
            case "job":
                return <Briefcase className="h-4 w-4" />
            case "connector":
                return <DatabaseZap className="h-4 w-4" />
            case "product":
            case "subscription":
                return <CreditCard className="h-4 w-4" />
            default:
                return <Bell className="h-4 w-4" />
        }
    }

    const getJobStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            case "failed":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            case "in-progress":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            case "pending":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
        }
    }

    const unreadCount = notifications.filter((n) => !n.read).length
    return (
        <div className="min-h-screen bg-background flex">
            <div className={cn("flex-1 overflow-auto", selectedNotification && "min-[1025px]:mr-96")}>
                <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
                        <p className="text-muted-foreground mt-1">Track forecast runs and connector sync updates.</p>
                        {unreadCount > 0 && <p className="text-sm text-muted-foreground mt-2">{unreadCount} unread</p>}
                    </div>
                    {error && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <NotificationsSort
                        onClearCompleted={clearCompleted}
                        onMarkAllRead={markAllRead}
                        clearCompletedDisabled={notifications.every((item) => item.jobStatus !== "completed")}
                        markAllReadDisabled={notifications.every((item) => item.read)}
                        actionLoading={actionLoading}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                    />
                    <NotificationsList
                        sortedNotifications={sortedNotifications}
                        selectedNotification={selectedNotification}
                        handleNotificationClick={handleNotificationClick}
                        getNotificationIcon={getNotificationIcon}
                        getJobStatusColor={getJobStatusColor}
                    />
                    {loading && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center gap-2 text-muted-foreground">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Loading more notifications...
                            </div>
                        </div>
                    )}

                    {hasMore && !loading && (
                        <div className="mb-4 text-center">
                            <button
                                className="text-sm font-medium text-blue-700 hover:text-blue-900"
                                onClick={loadMore}
                            >
                                Load more
                            </button>
                        </div>
                    )}
                    {!hasMore && notifications.length > 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>You&apos;ve reached the end of your notifications</p>
                        </div>
                    )}
                </div>
            </div>
            <NotificationsDetails
                selectedNotification={selectedNotification}
                getNotificationIcon={getNotificationIcon}
                setSelectedNotification={setSelectedNotification}
                getJobStatusColor={getJobStatusColor}
            />
        </div>
    )
}
