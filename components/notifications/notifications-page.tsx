"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Bell,
    Briefcase,
    CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {generateMockNotifications} from "@/components/notifications/generate-mock-notifications";
import {NotificationsPageTitle} from "@/components/notifications/notifications-page-title";
import {NotificationsSort} from "@/components/notifications/notifications-sort";
import {NotificationsList} from "@/components/notifications/notifications-list";
import {NotificationsDetails} from "@/components/notifications/notifications-details";

interface Notification {
    id: string
    type: "job" | "product" | "subscription" | "general"
    title: string
    message: string
    timestamp: Date
    read: boolean
    jobStatus?: "pending" | "in-progress" | "completed" | "failed"
    priority?: "low" | "medium" | "high"
    details?: string
    relatedUser?: string
    actionRequired?: boolean
}

type SortOption = "newest" | "oldest" | "unread" | "priority"

export const NotificationsPage = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [sortBy, setSortBy] = useState<SortOption>("newest")
    const [page, setPage] = useState(1)
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

    useEffect(() => {
        const initialNotifications = generateMockNotifications(20)
        setNotifications(initialNotifications)
    }, [])

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const newNotifications = generateMockNotifications(10)
        setNotifications((prev) => [...prev, ...newNotifications])
        setPage((prev) => prev + 1)

        if (page >= 5) {
            setHasMore(false)
        }

        setLoading(false)
    }, [loading, hasMore, page])

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

    const markAsRead = (id: string) => {
        setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
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

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight ||
                loading
            ) {
                return
            }
            loadMore()
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [loadMore, loading])

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

                    {!hasMore && notifications.length > 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>You've reached the end of your notifications</p>
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