"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Bell,
    Briefcase,
    CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {NotificationsPageTitle} from "@/components/notifications/notifications-page-title";
import {NotificationsSort} from "@/components/notifications/notifications-sort";
import {NotificationsList} from "@/components/notifications/notifications-list";
import {NotificationsDetails} from "@/components/notifications/notifications-details";
import { Notification } from "./notifications-types"
import { useProfile } from "@/hooks/use-profile"

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
    } | null
}

type SortOption = "newest" | "oldest" | "unread" | "priority"

export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextToken, setNextToken] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortOption>("newest")
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
    const { profile } = useProfile()

    useEffect(() => {
        const loadNotifications = async () => {
            setLoading(true)
            const res = await fetch("/api/list-notifications?limit=10")
            if (!res.ok) {
                setLoading(false)
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

            const mapped: Notification[] = items.map((run) => {
                const status = (run.status || "").toUpperCase()
                const jobStatus =
                    status === "DONE"
                        ? "completed"
                        : status === "FAILED"
                            ? "failed"
                            : status === "RUNNING"
                                ? "in-progress"
                                : "pending"

                let summary = run.summary || {}
                if (typeof run.summary === "string") {
                    try {
                        summary = JSON.parse(run.summary)
                    } catch {
                        summary = {}
                    }
                }
                const summaryText =
                    summary?.totalSkus && summary?.dateStart && summary?.dateEnd
                        ? `Processed ${summary.totalSkus} SKUs (${summary.dateStart} to ${summary.dateEnd}).`
                        : "Artifacts are being prepared."

                const message =
                    jobStatus === "completed"
                        ? `Forecast job completed for ${displayName}. ${summaryText}`
                        : jobStatus === "failed"
                            ? `Forecast job failed for ${displayName}. Please retry.`
                            : jobStatus === "in-progress"
                                ? `Forecast job is running for ${displayName}.`
                                : `Forecast job queued for ${displayName}.`

                const timestamp = new Date(run.updatedAt || run.createdAt || Date.now())

                return {
                    id: run.notificationId || run.runId,
                    type: "job",
                    title: "Job Report Generation",
                    message,
                    timestamp,
                    read: Boolean(run.read),
                    jobStatus,
                    priority: jobStatus === "failed" ? "high" : jobStatus === "in-progress" ? "medium" : "low",
                    details: `Run ID: ${run.runId}`,
                    relatedUser: displayName,
                }
            })

            setNotifications(mapped)
            setNextToken(token)
            setHasMore(Boolean(token))
            setLoading(false)
        }

        loadNotifications()
    }, [profile])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore || !nextToken) return

        setLoading(true)
        const res = await fetch(`/api/list-notifications?limit=10&nextToken=${encodeURIComponent(nextToken)}`)
        if (!res.ok) {
            setLoading(false)
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

        const mapped: Notification[] = items.map((run) => {
            const status = (run.status || "").toUpperCase()
            const jobStatus =
                status === "DONE"
                    ? "completed"
                    : status === "FAILED"
                        ? "failed"
                        : status === "RUNNING"
                            ? "in-progress"
                            : "pending"

            let summary = run.summary || {}
            if (typeof run.summary === "string") {
                try {
                    summary = JSON.parse(run.summary)
                } catch {
                    summary = {}
                }
            }

            const summaryText =
                summary?.totalSkus && summary?.dateStart && summary?.dateEnd
                    ? `Processed ${summary.totalSkus} SKUs (${summary.dateStart} to ${summary.dateEnd}).`
                    : "Artifacts are being prepared."

            const message =
                jobStatus === "completed"
                    ? `Forecast job completed for ${displayName}. ${summaryText}`
                    : jobStatus === "failed"
                        ? `Forecast job failed for ${displayName}. Please retry.`
                        : jobStatus === "in-progress"
                            ? `Forecast job is running for ${displayName}.`
                            : `Forecast job queued for ${displayName}.`

            const timestamp = new Date(run.updatedAt || run.createdAt || Date.now())

            return {
                id: run.notificationId || run.runId,
                type: "job",
                title: "Job Report Generation",
                message,
                timestamp,
                read: Boolean(run.read),
                jobStatus,
                priority: jobStatus === "failed" ? "high" : jobStatus === "in-progress" ? "medium" : "low",
                details: `Run ID: ${run.runId}`,
                relatedUser: displayName,
            }
        })

        setNotifications((prev) => [...prev, ...mapped])
        setNextToken(token)
        setHasMore(Boolean(token))
        setLoading(false)
    }, [loading, hasMore, nextToken, profile])

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
        markAsRead(notification.id)
        setSelectedNotification(notification)
    }

    const clearCompletedJobs = () => {
        setNotifications((prev) => prev.filter((notif) => !(notif.type === "job" && notif.jobStatus === "completed")))
    }

    const clearAll = () => {
        setNotifications([])
        setHasMore(false)
    }

    const getNotificationIcon = (notification: Notification) => {
        switch (notification.type) {
            case "job":
                return <Briefcase className="h-4 w-4" />
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
    const completedJobsCount = notifications.filter((n) => n.type === "job" && n.jobStatus === "completed").length

    return (
        <div className="flex h-screen bg-background">
            <div className={cn("flex-1 overflow-auto", selectedNotification && "mr-96")}>
                <div className="container mx-auto p-6 max-w-4xl">
                    <NotificationsPageTitle unreadCount={unreadCount}/>
                    <NotificationsSort
                        clearCompletedJobs={clearCompletedJobs}
                        completedJobsCount={completedJobsCount}
                        clearAll={clearAll}
                        notifications={notifications}
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
                        <div className="text-center py-6">
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
                markAsRead={markAsRead}
            />
        </div>
    )
}
