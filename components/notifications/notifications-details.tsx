import {Button} from "@/components/ui/button";
import {AlertCircle, Briefcase, Clock, User, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import React, {JSX} from "react";
import {JobStatusColorClass, Notification} from "./notifications-types"


type NotificationsDetailsProps = {
    selectedNotification: Notification | null,
    getNotificationIcon: (notification: Notification) => JSX.Element,
    setSelectedNotification: React.Dispatch<React.SetStateAction<Notification | null>>;
    getJobStatusColor: (status: string) => JobStatusColorClass,
    markAsRead: (id: string) => void,
}

export const NotificationsDetails = ({selectedNotification, getNotificationIcon, setSelectedNotification, getJobStatusColor, markAsRead}: NotificationsDetailsProps) => {
    return (
        <>
        {selectedNotification && (
            <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 overflow-auto">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {getNotificationIcon(selectedNotification)}
                            <h2 className="text-lg font-semibold">Notification Details</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedNotification(null)} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium mb-2">{selectedNotification.title}</h3>
                            <p className="text-sm text-muted-foreground">{selectedNotification.message}</p>
                        </div>

                        {selectedNotification.details && (
                            <div>
                                <h4 className="font-medium mb-2">Details</h4>
                                <p className="text-sm text-muted-foreground">{selectedNotification.details}</p>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                    {selectedNotification.timestamp.toLocaleDateString()} at{" "}
                                    {selectedNotification.timestamp.toLocaleTimeString()}
                  </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">{selectedNotification.type}</Badge>
                                {selectedNotification.priority && (
                                    <Badge variant={selectedNotification.priority === "high" ? "destructive" : "secondary"}>
                                        {selectedNotification.priority} priority
                                    </Badge>
                                )}
                            </div>

                            {selectedNotification.type === "job" && selectedNotification.jobStatus && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <Badge className={getJobStatusColor(selectedNotification.jobStatus)}>
                                        {selectedNotification.jobStatus}
                                    </Badge>
                                </div>
                            )}

                            {selectedNotification.relatedUser && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{selectedNotification.relatedUser}</span>
                                </div>
                            )}

                            {selectedNotification.actionRequired && (
                                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Action required</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t space-y-2">
                            {!selectedNotification.read && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAsRead(selectedNotification.id)}
                                    className="w-full"
                                >
                                    Mark as Read
                                </Button>
                            )}
                            <Button variant="outline" size="sm" className="w-full bg-transparent">
                                Archive
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}