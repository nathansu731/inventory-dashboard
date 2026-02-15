import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Package } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import React from "react"

export type SkuDetail = {
  sku: string
  skuDesc?: string
  store?: string
  forecastMethod?: string
  abcClass?: string
  abcPercentage?: number
  forecastSeries: { date: string; forecast: number; upper80?: number; lower80?: number }[]
}

type DashboardDetailModalProps = {
  isModalOpen: boolean
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectedSku: string | null
  getSelectedSkuData: () => SkuDetail | null
}

export const DashboardDetailModal = ({
  isModalOpen,
  setIsModalOpen,
  selectedSku,
  getSelectedSkuData,
}: DashboardDetailModalProps) => {
  const detail = getSelectedSkuData()

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {selectedSku} {detail?.skuDesc ? `- ${detail.skuDesc}` : ""}
          </DialogTitle>
        </DialogHeader>

        {detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-gray-600">Store</div>
                <div className="text-2xl font-bold">{detail.store ?? "--"}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-gray-600">Forecast Method</div>
                <div className="text-2xl font-bold">{detail.forecastMethod ?? "--"}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-gray-600">ABC Class</div>
                <div className="text-2xl font-bold">{detail.abcClass ?? "--"}</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-gray-600">Revenue Share</div>
                <div className="text-2xl font-bold">
                  {detail.abcPercentage !== undefined ? `${detail.abcPercentage.toFixed(2)}%` : "--"}
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Daily Forecast (Next 30 Days)</h3>
              <ChartContainer
                config={{
                  forecast: {
                    label: "Forecast",
                    color: "hsl(var(--chart-1))",
                  },
                  upper80: {
                    label: "Upper 80%",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[220px]"
              >
                <LineChart data={detail.forecastSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="var(--color-forecast)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-forecast)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="upper80"
                    stroke="var(--color-upper80)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "var(--color-upper80)" }}
                  />
                </LineChart>
              </ChartContainer>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Upcoming Forecasts</h3>
              <div className="space-y-3">
                {detail.forecastSeries.slice(0, 7).map((item) => (
                  <div key={item.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold">{item.forecast.toLocaleString()} units</span>
                      <Badge variant="secondary">Upper 80%: {Number(item.upper80 ?? 0).toLocaleString()}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
