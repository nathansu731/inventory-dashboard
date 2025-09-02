import {BellRing} from "lucide-react";
import {Badge} from "@/components/ui/badge";

type NotificationPageTitleProps = {
    unreadCount: number
}

export const NotificationsPageTitle = ({ unreadCount }: NotificationPageTitleProps) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <BellRing className="h-6 w-6"/>
                <h1 className="text-2xl font-bold">Notifications</h1>
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                        {unreadCount} unread
                    </Badge>
                )}
            </div>
        </div>
    )
}