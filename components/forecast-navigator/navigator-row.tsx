import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {ArrowLeft, ChevronLeft, ChevronRight, Copy, Network, Trash2} from "lucide-react";

export const NavigatorRow = () => {

    return (
        <Card className="py-1">
            <CardContent className="p-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>

                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">SKU-12345</span>
                            <Button variant="ghost" size="sm">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                            <Network className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}