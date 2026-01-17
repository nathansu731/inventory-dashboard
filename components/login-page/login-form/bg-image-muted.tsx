
import { cn } from "@/lib/utils";
import Image from "next/image";

type BgImageMutedProps = {
    src: string;
    alt?: string;
    className?: string;
};

export const BgImageMuted = ({ src, alt = "Inventory forecasting illustration", className }: BgImageMutedProps) => {
    return (
        <div className={cn("bg-muted relative hidden md:block", className)}>
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover dark:brightness-[0.2] dark:grayscale"
            />
        </div>
    )
}
