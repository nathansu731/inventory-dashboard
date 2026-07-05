
import Link from "next/link"

export const TermsAndPrivacyPrompt = () => {
    return (
        <div
            className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
            By clicking continue, you agree to our <Link href="/terms">Terms of Service</Link>{" "}
            and <Link href="/privacy">Privacy Policy</Link>.
        </div>
    )
}
