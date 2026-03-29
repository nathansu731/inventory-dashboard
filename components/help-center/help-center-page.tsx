"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useProfile } from "@/hooks/use-profile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

const CATEGORIES = [
  "General Question",
  "Billing and Subscription",
  "Forecast Accuracy",
  "Data Source Connection",
  "Bug Report",
  "Feature Request",
  "Account Access",
] as const

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

export const HelpCenterPage = () => {
  const { profile } = useProfile()
  const defaultName = useMemo(() => {
    const givenName = typeof profile?.given_name === "string" ? profile.given_name : ""
    const familyName = typeof profile?.family_name === "string" ? profile.family_name : ""
    return [givenName, familyName].filter(Boolean).join(" ").trim()
  }, [profile])
  const defaultEmail = useMemo(
    () => (typeof profile?.email === "string" ? profile.email : ""),
    [profile]
  )

  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("General Question")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    category?: string
    message?: string
    attachments?: string
  }>({})

  const totalAttachmentSize = attachments.reduce((sum, file) => sum + file.size, 0)

  useEffect(() => {
    setName((prev) => prev || defaultName)
    setEmail((prev) => prev || defaultEmail)
  }, [defaultEmail, defaultName])

  const handleFilesChange = (files: FileList | null) => {
    const fileArray = files ? Array.from(files) : []
    setAttachments(fileArray)
    setFieldErrors((prev) => ({ ...prev, attachments: undefined }))
    setSuccess(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const nextFieldErrors: typeof fieldErrors = {}
    if (!name.trim()) nextFieldErrors.name = "Name is required."
    if (!email.trim()) nextFieldErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextFieldErrors.email = "Enter a valid email address."
    if (!category) nextFieldErrors.category = "Category is required."
    if (!message.trim()) nextFieldErrors.message = "Message is required."
    if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      nextFieldErrors.attachments = `Total attachment size must be under 10MB (current ${formatBytes(totalAttachmentSize)}).`
    }

    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) return

    const formData = new FormData()
    formData.set("name", name.trim())
    formData.set("email", email.trim())
    formData.set("category", category)
    formData.set("subject", subject.trim())
    formData.set("message", message.trim())
    attachments.forEach((file) => formData.append("attachments", file))

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/help-center", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Failed to submit your request.")
        return
      }
      setSuccess("Your request has been sent. We will get back to you soon.")
      setName(defaultName)
      setEmail(defaultEmail)
      setCategory("General Question")
      setSubject("")
      setMessage("")
      setAttachments([])
      setFieldErrors({})
    } catch {
      setError("Failed to submit your request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
          <p className="text-muted-foreground mt-1">Send your feedback and inquiries.</p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Share your issue or request. Attach images or PDF files up to 10MB total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="help-name">Name</Label>
                  <Input id="help-name" value={name} onChange={(e) => setName(e.target.value)} />
                  {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="help-email">Email</Label>
                  <Input
                    id="help-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as (typeof CATEGORIES)[number])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.category && <p className="text-xs text-destructive">{fieldErrors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="help-subject">Subject (optional)</Label>
                  <Input
                    id="help-subject"
                    placeholder="Brief subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="help-message">Message</Label>
                <Textarea
                  id="help-message"
                  className="min-h-36"
                  placeholder="Describe your issue, feedback, or request."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {fieldErrors.message && <p className="text-xs text-destructive">{fieldErrors.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="help-attachments">Attachments</Label>
                <Input
                  id="help-attachments"
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(event) => handleFilesChange(event.target.files)}
                />
                <p className="text-xs text-muted-foreground">
                  Supported file types: images and PDF. Max total size 10MB.
                </p>
                {fieldErrors.attachments && <p className="text-xs text-destructive">{fieldErrors.attachments}</p>}
                {attachments.length > 0 && (
                  <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium mb-2">Selected files</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {attachments.map((file) => (
                        <li key={`${file.name}-${file.lastModified}`}>
                          {file.name} ({formatBytes(file.size)})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Total: {formatBytes(totalAttachmentSize)} / 10.00 MB
                    </p>
                  </div>
                )}
              </div>

              {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
              {success && <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
