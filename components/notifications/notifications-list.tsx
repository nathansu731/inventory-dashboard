import {Card, CardContent} from "@/components/ui/card";
import {Bell} from "lucide-react";
import {cn} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {JSX} from "react";
import {JobStatusColorClass, Notification} from "./notifications-types"

type NotificationsListProps = {
    sortedNotifications: Notification[],
    selectedNotification: Notification | null,
    handleNotificationClick: (notification: Notification) => void,
    getNotificationIcon: (notification: Notification) => JSX.Element,
    getJobStatusColor: (status: string) => JobStatusColorClass
}

export const NotificationsList = ({sortedNotifications, selectedNotification, handleNotificationClick, getNotificationIcon,getJobStatusColor }: NotificationsListProps) => {
    return (
        <div className="space-y-1">
            {sortedNotifications.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground"/>
                        <h3 className="text-lg font-medium mb-2">No notifications</h3>
                        <p className="text-muted-foreground">You're all caught up!</p>
                    </CardContent>
                </Card>
            ) : (
                sortedNotifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/50",
                            !notification.read && "border-l-4 border-l-primary bg-muted/20",
                            notification.type === "job" && "bg-gray-100 dark:bg-gray-800",
                            selectedNotification?.id === notification.id && "ring-2 ring-primary",
                        )}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <CardContent className="p-2">
                            <div className="flex items-start gap-2">
                                <div
                                    className={cn("p-1 rounded-full", notification.read ? "bg-muted" : "bg-primary/10")}>
                                    {getNotificationIcon(notification)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-0.5">
                                        <h3 className={cn("font-medium truncate text-sm", !notification.read && "font-semibold")}>
                                            {notification.title}
                                        </h3>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {notification.type === "job" && notification.jobStatus && (
                                                <Badge
                                                    variant="secondary"
                                                    className={cn("text-xs h-5", getJobStatusColor(notification.jobStatus))}
                                                >
                                                    {notification.jobStatus}
                                                </Badge>
                                            )}
                                            {!notification.read &&
                                                <div className="w-1.5 h-1.5 bg-primary rounded-full"/>}
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{notification.message}</p>

                                    <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {notification.timestamp.toLocaleDateString()} at{" "}
                              {notification.timestamp.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                          </span>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="text-xs h-4 px-1">
                                                {notification.type}
                                            </Badge>
                                            {notification.priority && (
                                                <Badge
                                                    variant={notification.priority === "high" ? "destructive" : "secondary"}
                                                    className="text-xs h-4 px-1"
                                                >
                                                    {notification.priority}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    )
}