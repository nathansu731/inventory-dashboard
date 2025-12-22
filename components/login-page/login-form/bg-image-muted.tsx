
import { cn } from "@/lib/utils";

type BgImageMutedProps = {
    src: string;
    alt?: string;
    className?: string;
};

export const BgImageMuted = ({ src, alt = "Inventory forecasting illustration", className }: BgImageMutedProps) => {
    return (
        <div className={cn("bg-muted relative hidden md:block", className)}>
            <img
                src={src}
                alt={alt}
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        </div>
    )
}
