import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";

export const EmailSection = () => {
    return (
        <div className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
                id="email"
                name="username"
                type="email"
                placeholder="m@example.com"
                required
            />
        </div>
    )
}
