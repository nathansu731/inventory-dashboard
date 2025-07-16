'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TokenGenerator() {
    const [token, setToken] = useState('')
    const [copied, setCopied] = useState(false)

    function generateToken() {
        const newToken =
            Math.random().toString(36).slice(2, 10) +
            '-' +
            Math.random().toString(36).slice(2, 10)
        setToken(newToken)
        setCopied(false)
    }

    function copyToClipboard() {
        if (token) {
            navigator.clipboard.writeText(token)
            setCopied(true)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
            <Button onClick={generateToken} className="gap-2">
                🔄 Generate a new token
            </Button>
            </div>
            {token && (
                <div className="flex items-center gap-2">
                    <Input readOnly value={token} className="w-full" />
                    <Button variant="outline" onClick={copyToClipboard}>
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                </div>
            )}
        </div>
    )
}