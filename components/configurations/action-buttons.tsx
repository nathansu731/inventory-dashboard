import {Button} from "@/components/ui/button";
import {Settings, Zap} from "lucide-react";

type ActionButtonsProps = {
    handleReset: () => void;
    handleSave: () => void;
}

export const ActionButtons = ({handleReset, handleSave}: ActionButtonsProps) => {
    return (
        <div className="flex items-center justify-between border-t pt-6">
            <Button variant="outline" onClick={handleReset}>
                Reset to Defaults
            </Button>
            <div className="flex gap-3">
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4"/>
                    Advanced Settings
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    <Zap className="mr-2 h-4 w-4"/>
                    Save Configuration
                </Button>
            </div>
        </div>
    )
}