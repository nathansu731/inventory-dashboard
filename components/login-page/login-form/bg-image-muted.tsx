

export function BgImageMuted() {
    return (
        <div className="bg-muted relative hidden md:block">
            <img
                src="/placeholder.svg"
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        </div>
    )
}