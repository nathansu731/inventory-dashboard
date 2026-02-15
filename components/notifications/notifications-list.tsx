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
                        <p className="text-muted-foreground">You&apos;re all caught up!</p>
                    </CardContent>
                </Card>
            ) : (
                sortedNotifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={cn(
                            "cursor-pointer transition-colors rounded-2xl border",
                            !notification.read && "border-l-4 border-l-blue-600 bg-blue-50/80",
                            notification.type === "job" && "bg-blue-50/60 border-blue-100",
                            selectedNotification?.id === notification.id && "ring-2 ring-primary",
                        )}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        "p-2 rounded-full border",
                                        notification.read ? "bg-muted border-muted" : "bg-blue-100 border-blue-200"
                                    )}
                                >
                                    {getNotificationIcon(notification)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h3 className={cn("font-semibold truncate text-base", !notification.read && "text-slate-900")}>
                                            {notification.title}
                                        </h3>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {notification.type === "job" && notification.jobStatus && (
                                                <Badge
                                                    variant="secondary"
                                                    className={cn("text-xs h-6 px-2 rounded-full capitalize", getJobStatusColor(notification.jobStatus))}
                                                >
                                                    {notification.jobStatus}
                                                </Badge>
                                            )}
                                            {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>

                                    <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {notification.timestamp.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at{" "}
                              {notification.timestamp.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                          </span>
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="text-xs h-5 px-2 rounded-full">
                                                {notification.type}
                                            </Badge>
                                            {notification.priority && (
                                                <Badge
                                                    variant={notification.priority === "high" ? "destructive" : "secondary"}
                                                    className="text-xs h-5 px-2 rounded-full"
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
