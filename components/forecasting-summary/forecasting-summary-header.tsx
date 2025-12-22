import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {Bell} from "lucide-react";


export const ForecastingSummaryHeader = () => {
    return (
        <div className="border-b bg-muted/40">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src="/user-ark.jpg?height=40&width=40"/>
                            <AvatarFallback>FS</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Forecasting Summary</h1>
                            <p className="text-sm text-muted-foreground">Manage and review your demand forecasting
                                results</p>
                        </div>
                    </div>
                    <Button variant="outline" size="icon">
                        <Bell className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}