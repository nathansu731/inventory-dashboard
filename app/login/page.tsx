import { LoginForm } from "@/components/login-page/login-form"

export const metadata = {
    title: 'Login',
    description: 'Login',
}

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
