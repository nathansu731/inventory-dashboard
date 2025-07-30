"use client";

import type React from "react";

import { useState } from "react";
import {KpisControlsRow} from "@/components/kpis/kpis-controls-row";
import {KpisMainContentLeft} from "@/components/kpis/kpis-main-content-left";
import {KpisMainContentRight} from "@/components/kpis/kpis-main-content-right";
import {forecastDataKpi} from "@/components/kpis/sample-data";



export const Kpis = () => {
    const [aggregationType, setAggregationType] = useState("Monthly");
    const [unitsType, setUnitsType] = useState("USD");


    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="border-b bg-background px-6 py-4">
                <h1 className="text-2xl font-semibold text-foreground">KPIs</h1>
            </div>
            <KpisControlsRow aggregationType={aggregationType} setAggregationType={setAggregationType} unitsType={unitsType} setUnitsType={setUnitsType}/>
            <div className="flex flex-1 overflow-hidden">
                <KpisMainContentLeft/>
                <KpisMainContentRight forecastValues={forecastDataKpi}/>
            </div>
        </div>
    );
};