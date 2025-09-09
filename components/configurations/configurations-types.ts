
export type Config = {
    computeFromAggregation: boolean;
    forecastHorizon: number;
    forecastStartDate: string;
    initialConsensus: number;
    confidenceInterval: number;
    seasonalityDetection: string;
    modelType: string;
    dataFrequency: string;
    outlierDetection: boolean;
    trendDamping: boolean;
    minHistoryPeriods: number;
};