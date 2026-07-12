import { LoginForm } from "@/components/login-page/login-form"
import { ArkLoader } from "@/components/ark-loader/ark-loader"
import { Suspense } from "react"

export const metadata = {
    title: 'Login',
    description: 'Login',
}

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <ArkLoader size={64} />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
