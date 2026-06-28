import {Button} from "@/components/ui/button";
import {AlertCircle, Briefcase, Clock, User, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import React, {JSX} from "react";
import {JobStatusColorClass, Notification} from "./notifications-types"
import { formatJobStatusLabel } from "@/lib/run-status"
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";


type NotificationsDetailsProps = {
    selectedNotification: Notification | null,
    getNotificationIcon: (notification: Notification) => JSX.Element,
    setSelectedNotification: React.Dispatch<React.SetStateAction<Notification | null>>;
    getJobStatusColor: (status: string) => JobStatusColorClass,
}

export const NotificationsDetails = ({selectedNotification, getNotificationIcon, setSelectedNotification, getJobStatusColor}: NotificationsDetailsProps) => {
    return (
        <ResponsiveDrawer
            open={Boolean(selectedNotification)}
            onOpenChange={(open) => {
                if (!open) setSelectedNotification(null)
            }}
            desktopClassName="w-96"
        >
            {selectedNotification && (
                <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between border-b p-6">
                        <div className="flex items-center gap-2">
                            {getNotificationIcon(selectedNotification)}
                            <h2 className="text-lg font-semibold">Notification Details</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedNotification(null)} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="mb-2 font-medium">{selectedNotification.title}</h3>
                                <p className="text-sm text-muted-foreground">{selectedNotification.message}</p>
                            </div>

                            {selectedNotification.details && (
                                <div>
                                    <h4 className="mb-2 font-medium">Details</h4>
                                    <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedNotification.details}</p>
                                </div>
                            )}

                            {selectedNotification.detailItems && selectedNotification.detailItems.length > 0 && (
                                <div>
                                    <h4 className="mb-2 font-medium">Run Snapshot</h4>
                                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                        {selectedNotification.detailItems.map((item) => (
                                            <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
                                                <span className="text-muted-foreground">{item.label}</span>
                                                <span className="text-right font-medium">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                        {selectedNotification.timestamp.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} at{" "}
                                        {selectedNotification.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                                            {formatJobStatusLabel(selectedNotification.jobStatus)}
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
                        </div>
                    </div>

                </div>
            )}
        </ResponsiveDrawer>
    )
}
