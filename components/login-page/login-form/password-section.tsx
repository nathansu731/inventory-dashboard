import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";

export const PasswordSection = () => {
    return (
        <div className="grid gap-3">
            <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                    href="/reset-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                >
                    Forgot your password?
                </a>
            </div>
            <Input id="password" name="password" type="password" required/>
        </div>
    )
}
