import {Notification} from "./notifications-types"

export const generateMockNotifications = (count: number): Notification[] => {
    const types: Notification["type"][] = ["job", "product", "subscription", "general"]
    const jobStatuses: Notification["jobStatus"][] = ["pending", "in-progress", "completed", "failed"]
    const priorities: Notification["priority"][] = ["low", "medium", "high"]

    return Array.from({ length: count }, (_, i) => {
        const type = types[Math.floor(Math.random() * types.length)]
        const isJob = type === "job"

        return {
            id: `notification-${i}`,
            type,
            title: isJob
                ? `Job ${["Data Processing", "Report Generation", "File Upload", "Backup Task"][Math.floor(Math.random() * 4)]}`
                : type === "product"
                    ? `Product ${["Update Available", "Feature Released", "Maintenance"][Math.floor(Math.random() * 3)]}`
                    : type === "subscription"
                        ? `Subscription ${["Renewed", "Expiring Soon", "Payment Failed"][Math.floor(Math.random() * 3)]}`
                        : `System ${["Alert", "Update", "Reminder"][Math.floor(Math.random() * 3)]}`,
            message: `This is a sample notification message for ${type} type notification.`,
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            read: Math.random() > 0.4,
            jobStatus: isJob ? jobStatuses[Math.floor(Math.random() * jobStatuses.length)] : undefined,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            details: `Detailed information about this ${type} notification. This includes additional context, steps taken, and any relevant information that might be useful for the user to understand the full scope of this notification.`,
            relatedUser: Math.random() > 0.5 ? `user${Math.floor(Math.random() * 100)}@example.com` : undefined,
            actionRequired: Math.random() > 0.7,
        }
    })
}