
export const rowData = [
    {
        label: "Budget",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 10000).toFixed(0)),
    },
    {
        label: "Demand",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 8000).toFixed(0)),
    },
    {
        label: "Demand Adjustment",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 1000 - 500).toFixed(0)),
    },
    {
        label: "Forecast Baseline",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 9000).toFixed(0)),
    },
    {
        label: "Forecast Adjustment",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 2000 - 1000).toFixed(0)),
    },
    {
        label: "Previous Forecasts",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 8500).toFixed(0)),
    },
    {
        label: "Variance",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 3000 - 1500).toFixed(0)),
    },
    {
        label: "Revenue",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 12000).toFixed(0)),
    },
]