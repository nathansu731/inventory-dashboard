export const kpiRowData = [
    {
        label: "Demand",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 10000).toFixed(0)),
    },
    {
        label: "Accuracy",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 8000).toFixed(0)),
    },
    {
        label: "Error",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 1000 - 500).toFixed(0)),
    },
    {
        label: "Bias(%)",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 9000).toFixed(0)),
    },
    {
        label: "Bias",
        values: Array(12)
            .fill(0)
            .map(() => (Math.random() * 2000 - 1000).toFixed(0)),
    },
]