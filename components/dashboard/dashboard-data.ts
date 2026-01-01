import {AlertTriangle, Calendar, Package, TrendingUp} from "lucide-react";


export const metricsData = [
    {
        title: "Total SKUs",
        value: "2,847",
        change: "+12%",
        trend: "up",
        icon: Package,
    },
    {
        title: "Forecast Accuracy",
        value: "87.3%",
        change: "+2.1%",
        trend: "up",
        icon: TrendingUp,
    },
    {
        title: "Out of Stock Risk",
        value: "23",
        change: "-8",
        trend: "down",
        icon: AlertTriangle,
    },
    {
        title: "Avg Lead Time",
        value: "14.2 days",
        change: "+1.3",
        trend: "up",
        icon: Calendar,
    },
]

export const forecastData = [
    { month: "Jan", actual: 2400, forecast: 2200, demand: 2100 },
    { month: "Feb", actual: 1398, forecast: 1500, demand: 1600 },
    { month: "Mar", actual: 9800, forecast: 9500, demand: 9200 },
    { month: "Apr", actual: 3908, forecast: 4100, demand: 4000 },
    { month: "May", actual: 4800, forecast: 4600, demand: 4700 },
    { month: "Jun", actual: 3800, forecast: 3900, demand: 3850 },
    { month: "Jul", actual: 1100, forecast: 4200, demand: 4100 },
    { month: "Aug", actual: 12500, forecast: 4500, demand: 4300 },
    { month: "Sep", actual: 750, forecast: 4800, demand: 4600 },
]

export const skuTableData = [
    {
        sku: "SKU-001",
        name: "Wireless Headphones Pro",
        category: "Electronics",
        currentStock: 245,
        forecastDemand: 180,
        riskLevel: "Low",
        accuracy: "92%",
    },
    {
        sku: "SKU-002",
        name: "Smart Watch Series X",
        category: "Electronics",
        currentStock: 89,
        forecastDemand: 150,
        riskLevel: "High",
        accuracy: "78%",
    },
    {
        sku: "SKU-003",
        name: "Bluetooth Speaker Mini",
        category: "Electronics",
        currentStock: 156,
        forecastDemand: 120,
        riskLevel: "Medium",
        accuracy: "85%",
    },
    {
        sku: "SKU-004",
        name: "USB-C Cable 2m",
        category: "Accessories",
        currentStock: 892,
        forecastDemand: 300,
        riskLevel: "Low",
        accuracy: "94%",
    },
    {
        sku: "SKU-005",
        name: "Laptop Stand Adjustable",
        category: "Accessories",
        currentStock: 67,
        forecastDemand: 95,
        riskLevel: "High",
        accuracy: "81%",
    },
]

export const alerts = [
    {
        type: "critical",
        message: "SKU-002 projected stockout in 5 days",
        time: "2 hours ago",
    },
    {
        type: "warning",
        message: "Forecast accuracy dropped 3% for Electronics category",
        time: "4 hours ago",
    },
    {
        type: "info",
        message: "New demand pattern detected for SKU-001",
        time: "1 day ago",
    },
]

export const skuDetailData = {
    "SKU-001": {
        name: "Wireless Headphones Pro",
        category: "Electronics",
        description: "Premium wireless headphones with active noise cancellation",
        currentStock: 245,
        reorderPoint: 100,
        maxStock: 500,
        unitCost: 89.99,
        sellingPrice: 149.99,
        supplier: "TechCorp Industries",
        leadTime: 12,
        forecastAccuracy: "92%",
        riskLevel: "Low",
        historicalData: [
            { month: "Jan", sales: 45, forecast: 42, accuracy: 93 },
            { month: "Feb", sales: 38, forecast: 40, accuracy: 95 },
            { month: "Mar", sales: 52, forecast: 48, accuracy: 92 },
            { month: "Apr", sales: 41, forecast: 45, accuracy: 89 },
            { month: "May", sales: 47, forecast: 46, accuracy: 98 },
            { month: "Jun", sales: 39, forecast: 41, accuracy: 95 },
        ],
        futureForecasts: [
            { month: "Jul", forecast: 44, confidence: 85 },
            { month: "Aug", forecast: 48, confidence: 82 },
            { month: "Sep", forecast: 51, confidence: 79 },
            { month: "Oct", forecast: 46, confidence: 81 },
        ],
        alerts: [
            { type: "info", message: "Seasonal demand increase expected in Q4", severity: "low" },
            { type: "success", message: "Forecast accuracy above target", severity: "low" },
        ],
    },
    "SKU-002": {
        name: "Smart Watch Series X",
        category: "Electronics",
        description: "Advanced smartwatch with health monitoring and GPS",
        currentStock: 89,
        reorderPoint: 120,
        maxStock: 300,
        unitCost: 199.99,
        sellingPrice: 299.99,
        supplier: "WearTech Solutions",
        leadTime: 18,
        forecastAccuracy: "78%",
        riskLevel: "High",
        historicalData: [
            { month: "Jan", sales: 28, forecast: 25, accuracy: 89 },
            { month: "Feb", sales: 22, forecast: 28, accuracy: 79 },
            { month: "Mar", sales: 35, forecast: 30, accuracy: 83 },
            { month: "Apr", sales: 31, forecast: 35, accuracy: 89 },
            { month: "May", sales: 26, forecast: 32, accuracy: 81 },
            { month: "Jun", sales: 29, forecast: 28, accuracy: 96 },
        ],
        futureForecasts: [
            { month: "Jul", forecast: 32, confidence: 75 },
            { month: "Aug", forecast: 35, confidence: 72 },
            { month: "Sep", forecast: 38, confidence: 70 },
            { month: "Oct", forecast: 34, confidence: 73 },
        ],
        alerts: [
            { type: "warning", message: "Stock below reorder point", severity: "high" },
            { type: "warning", message: "Forecast accuracy below target", severity: "medium" },
            { type: "info", message: "New product launch affecting demand", severity: "low" },
        ],
    },
}

export type SkuDetailData = typeof skuDetailData;
export type Sku = SkuDetailData[keyof SkuDetailData];