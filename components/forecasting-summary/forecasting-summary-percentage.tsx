import {Checkbox} from "@/components/ui/checkbox";


type ForecastingSummaryPercentageProps = {
    columnKey: string;
    label: string;
    checked: boolean;
    onChange: (columnKey: string, checked: boolean) => void;
}

export const ForecastingSummaryPercentage = ({columnKey, label, checked, onChange}: ForecastingSummaryPercentageProps) => {
    return (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={columnKey}
                checked={checked}
                onCheckedChange={(checked) => onChange(columnKey, checked as boolean)}
            />
            <label
                htmlFor={columnKey}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                {label}
            </label>
        </div>
    )
}