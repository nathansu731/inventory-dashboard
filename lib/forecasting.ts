export async function fetchForecastResult<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null

  const json = await res.json()
  const result = typeof json?.result === "string" ? JSON.parse(json.result) : json?.result
  return (result ?? null) as T | null
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = key.match(/^(\d{2})-(\d{4})$/)
  if (!match) return null
  return { month: Number(match[1]), year: Number(match[2]) }
}

export function formatMonthKey(key: string): string {
  const parsed = parseMonthKey(key)
  if (!parsed) return key
  return `${String(parsed.month).padStart(2, "0")}/${parsed.year}`
}

export function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const pa = parseMonthKey(a)
    const pb = parseMonthKey(b)
    if (!pa || !pb) return a.localeCompare(b)
    if (pa.year !== pb.year) return pa.year - pb.year
    return pa.month - pb.month
  })
}
