import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SlidersHorizontal } from "lucide-react"
import type React from "react"
import { Input } from "@/components/ui/input"

type FieldConfigurationSectionProps = {
  uploadedColumns: string[]
  dateFormat: string
  setDateFormat: React.Dispatch<React.SetStateAction<string>>
  skuColumnName: string
  setSkuColumnName: React.Dispatch<React.SetStateAction<string>>
  storeColumnName: string
  setStoreColumnName: React.Dispatch<React.SetStateAction<string>>
  targetVariable: string
  setTargetVariable: React.Dispatch<React.SetStateAction<string>>
  onHandColumnName: string
  setOnHandColumnName: React.Dispatch<React.SetStateAction<string>>
  priceColumnName: string
  setPriceColumnName: React.Dispatch<React.SetStateAction<string>>
  holidayColumnName: string
  setHolidayColumnName: React.Dispatch<React.SetStateAction<string>>
  promotionColumnName: string
  setPromotionColumnName: React.Dispatch<React.SetStateAction<string>>
  openStatusColumnName: string
  setOpenStatusColumnName: React.Dispatch<React.SetStateAction<string>>
}

export const FieldConfigurationSection = ({
  uploadedColumns,
  dateFormat,
  setDateFormat,
  skuColumnName,
  setSkuColumnName,
  storeColumnName,
  setStoreColumnName,
  targetVariable,
  setTargetVariable,
  onHandColumnName,
  setOnHandColumnName,
  priceColumnName,
  setPriceColumnName,
  holidayColumnName,
  setHolidayColumnName,
  promotionColumnName,
  setPromotionColumnName,
  openStatusColumnName,
  setOpenStatusColumnName,
}: FieldConfigurationSectionProps) => {
  const hasUploadedColumns = uploadedColumns.length > 0
  const optionalValue = (value: string) => (value && value.length > 0 ? value : "__none__")

  const renderUploadedColumnSelect = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    required = false
  ) => (
    <Select
      value={required ? value : optionalValue(value)}
      onValueChange={(next) => onChange(next === "__none__" ? "" : next)}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!required && <SelectItem value="__none__">Not mapped</SelectItem>}
        {uploadedColumns.map((column) => (
          <SelectItem key={column} value={column}>
            {column}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          Field Configuration
        </CardTitle>
        <CardDescription>Map the core fields used by the forecasting pipeline and optional regression features.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {hasUploadedColumns && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detected Columns</div>
            <div className="flex flex-wrap gap-2">
              {uploadedColumns.map((column) => (
                <span key={column} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {column}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="date-format">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/mm/yyyy">dd/mm/yyyy</SelectItem>
                <SelectItem value="mm/dd/yyyy">mm/dd/yyyy</SelectItem>
                <SelectItem value="yyyy-mm-dd">yyyy-mm-dd</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku-column-name">SKU column</Label>
            {hasUploadedColumns ? renderUploadedColumnSelect("sku-column-name", skuColumnName, setSkuColumnName, "Optional SKU column") : (
              <Input
                id="sku-column-name"
                value={skuColumnName}
                onChange={(event) => setSkuColumnName(event.target.value)}
                placeholder="sku"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-column-name">Store column</Label>
            {hasUploadedColumns ? renderUploadedColumnSelect("store-column-name", storeColumnName, setStoreColumnName, "Optional store column") : (
              <Input
                id="store-column-name"
                value={storeColumnName}
                onChange={(event) => setStoreColumnName(event.target.value)}
                placeholder="store"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="target-variable">Target Variable for forecast</Label>
            {hasUploadedColumns ? renderUploadedColumnSelect("target-variable", targetVariable, setTargetVariable, "Select target column", true) : (
              <Input
                id="target-variable"
                value={targetVariable}
                onChange={(event) => setTargetVariable(event.target.value)}
                placeholder="quantity"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="on-hand-column-name">On-hand inventory column</Label>
            {hasUploadedColumns ? renderUploadedColumnSelect("on-hand-column-name", onHandColumnName, setOnHandColumnName, "Optional on-hand column") : (
              <Input
                id="on-hand-column-name"
                value={onHandColumnName}
                onChange={(event) => setOnHandColumnName(event.target.value)}
                placeholder="on_hand"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-column-name">Price variable name</Label>
            {hasUploadedColumns ? renderUploadedColumnSelect("price-column-name", priceColumnName, setPriceColumnName, "Select price column", true) : (
              <Input
                id="price-column-name"
                value={priceColumnName}
                onChange={(event) => setPriceColumnName(event.target.value)}
                placeholder="price"
              />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Regression Feature Mapping</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-column-name">Holiday flag</Label>
              {hasUploadedColumns ? renderUploadedColumnSelect("holiday-column-name", holidayColumnName, setHolidayColumnName, "Optional holiday column") : (
                <Input
                  id="holiday-column-name"
                  value={holidayColumnName}
                  onChange={(event) => setHolidayColumnName(event.target.value)}
                  placeholder="isholiday"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotion-column-name">Promotion flag</Label>
              {hasUploadedColumns ? renderUploadedColumnSelect("promotion-column-name", promotionColumnName, setPromotionColumnName, "Optional promotion column") : (
                <Input
                  id="promotion-column-name"
                  value={promotionColumnName}
                  onChange={(event) => setPromotionColumnName(event.target.value)}
                  placeholder="promotion"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="open-status-column-name">Store open flag</Label>
              {hasUploadedColumns ? renderUploadedColumnSelect("open-status-column-name", openStatusColumnName, setOpenStatusColumnName, "Optional open-status column") : (
                <Input
                  id="open-status-column-name"
                  value={openStatusColumnName}
                  onChange={(event) => setOpenStatusColumnName(event.target.value)}
                  placeholder="isShopOpened"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
