import {ScrollArea} from "@/components/ui/scroll-area";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import type React from "react";
import {kpiData} from "@/components/kpis/sample-data";


export const KpisMainContentLeft = () => {
    return (
        <div className="w-1/3 border-r bg-background">
            <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-medium text-foreground">KPI Left Chart</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-180px)]">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead className="w-[140px]">Customer</TableHead>
                            <TableHead className="w-[100px]">Family</TableHead>
                            <TableHead className="w-[80px]">ABC Class</TableHead>
                            <TableHead>XYZ Class</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {kpiData.map((item, index) => (
                            <TableRow key={index} className="h-12">
                                <TableCell className="font-medium text-sm">
                                    {item.metric}
                                </TableCell>
                                <TableCell className="text-sm font-mono">
                                    {item.value}
                                </TableCell>
                                <TableCell
                                    className={`text-sm font-mono ${
                                        item.variance.startsWith("+")
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {item.variance}
                                </TableCell>
                                <TableCell>
                      <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.status === "Exceeding" ||
                              item.status === "Strong" ||
                              item.status === "Accelerating"
                                  ? "bg-green-100 text-green-800"
                                  : item.status === "On Track" ||
                                  item.status === "Improving" ||
                                  item.status === "Positive" ||
                                  item.status === "Growing"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {item.status}
                      </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}