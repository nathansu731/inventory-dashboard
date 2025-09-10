"use client";

import type React from "react";

import { useState } from "react";
import {forecastData} from "@/components/forecast-editor/sample-data";
import {ForecastEditorControlsRow} from "@/components/forecast-editor/forecast-editor-controls-row";
import {ForecastEditorMainContentLeft} from "@/components/forecast-editor/forecast-editor-main-content-left";
import {ForecastEditorMainContentRight} from "@/components/forecast-editor/forecast-editor-main-content-right";



export const ForecastEditor = () => {
    const [aggregationType, setAggregationType] = useState("Monthly");
    const [unitsType, setUnitsType] = useState("USD");
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
    const [forecastValues, setForecastValues] = useState(forecastData);
    const [tempValue, setTempValue] = useState("");

    const handleCellClick = (rowIndex: number, month: string) => {
        const cellKey = `${rowIndex}-${month}`;
        setEditingCell(cellKey);
        setTempValue(
            forecastValues[rowIndex][
                month as keyof (typeof forecastValues)[0]
                ].toString()
        );
    };

    const handleCellBlur = (rowIndex: number, month: string) => {
        const cellKey = `${rowIndex}-${month}`;
        const numericValue = Number.parseFloat(tempValue) || 0;

        // Update the forecast values
        const updatedValues = [...forecastValues];
        updatedValues[rowIndex] = {
            ...updatedValues[rowIndex],
            [month]: numericValue,
        };
        setForecastValues(updatedValues);

        // Mark cell as edited
        setEditedCells((prev) => new Set([...prev, cellKey]));
        setEditingCell(null);
    };

    const handleKeyPress = (
        e: React.KeyboardEvent,
        rowIndex: number,
        month: string
    ) => {
        if (e.key === "Enter") {
            handleCellBlur(rowIndex, month);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="border-b bg-background px-6 py-4">
                <h1 className="text-2xl font-semibold text-foreground">Forecast Editor</h1>
            </div>
            <ForecastEditorControlsRow aggregationType={aggregationType} setAggregationType={setAggregationType} unitsType={unitsType} setUnitsType={setUnitsType}/>
            <div className="flex flex-1">
                <ForecastEditorMainContentLeft/>
                <ForecastEditorMainContentRight forecastValues={forecastValues} editingCell={editingCell} editedCells={editedCells} handleCellClick={handleCellClick} tempValue={tempValue} setTempValue={setTempValue} handleCellBlur={handleCellBlur} handleKeyPress={handleKeyPress}/>
            </div>
        </div>
    );
};