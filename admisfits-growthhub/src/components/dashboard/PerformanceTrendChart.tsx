import * as React from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Settings, Expand } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChartModal } from "@/components/ui/chart-modal";

interface PerformanceTrendChartProps {
  className?: string;
}

const availableMetrics = [
  { key: "ctr", label: "CTR (%)", color: "rgb(14, 116, 144)" },
  { key: "cpc", label: "CPC ($)", color: "rgb(5, 150, 105)" },
  { key: "roas", label: "ROAS", color: "rgb(16, 185, 129)" },
  { key: "conversion_rate", label: "Conversion Rate (%)", color: "rgb(6, 182, 212)" },
];

const chartConfig = {
  ctr: {
    label: "CTR (%)",
    color: "rgb(14, 116, 144)",
  },
  cpc: {
    label: "CPC ($)",
    color: "rgb(5, 150, 105)",
  },
  roas: {
    label: "ROAS",
    color: "rgb(16, 185, 129)",
  },
  conversion_rate: {
    label: "Conversion Rate (%)",
    color: "rgb(6, 182, 212)",
  },
} satisfies ChartConfig;

// Sample trend data for the last 7 days
const trendData = [
  { day: "Day 1", ctr: 2.4, cpc: 1.25, roas: 3.2, conversion_rate: 4.8 },
  { day: "Day 2", ctr: 2.8, cpc: 1.18, roas: 3.5, conversion_rate: 5.2 },
  { day: "Day 3", ctr: 3.1, cpc: 1.15, roas: 3.8, conversion_rate: 5.5 },
  { day: "Day 4", ctr: 2.9, cpc: 1.22, roas: 3.4, conversion_rate: 5.1 },
  { day: "Day 5", ctr: 3.3, cpc: 1.12, roas: 4.1, conversion_rate: 5.8 },
  { day: "Day 6", ctr: 3.0, cpc: 1.20, roas: 3.7, conversion_rate: 5.4 },
  { day: "Day 7", ctr: 3.2, cpc: 1.16, roas: 3.9, conversion_rate: 5.6 },
];

export function PerformanceTrendChart({ className }: PerformanceTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = React.useState("ctr");
  const [isExpanded, setIsExpanded] = React.useState(false);

  const selectedMetricData = availableMetrics.find(m => m.key === selectedMetric);

  const ChartContent = ({ height = 200, showGrid = true }: { height?: number; showGrid?: boolean }) => (
    <ChartContainer
      config={chartConfig}
      className={`aspect-auto w-full`}
      style={{ height: `${height}px` }}
    >
      <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={showGrid ? 50 : 40}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              className="w-[150px]"
            />
          }
        />
        <Line
          type="monotone"
          dataKey={selectedMetric}
          stroke={selectedMetricData?.color}
          strokeWidth={showGrid ? 3 : 2}
          dot={{ 
            fill: selectedMetricData?.color, 
            strokeWidth: 2, 
            r: showGrid ? 5 : 4 
          }}
          activeDot={{ 
            r: showGrid ? 7 : 6, 
            stroke: selectedMetricData?.color, 
            strokeWidth: 2, 
            fill: "white" 
          }}
        />
      </LineChart>
    </ChartContainer>
  );

  return (
    <>
      <Card className={className} onDoubleClick={() => setIsExpanded(true)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{selectedMetricData?.label} Trend</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Last 7 days performance
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsExpanded(true)}
          >
            <Expand className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Select Metric</h4>
                {availableMetrics.map(metric => (
                  <Button
                    key={metric.key}
                    variant={selectedMetric === metric.key ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedMetric(metric.key)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: metric.color }}
                    />
                    {metric.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContent height={200} />
      </CardContent>
    </Card>

    {/* Expanded Chart Modal */}
    <ChartModal
      isOpen={isExpanded}
      onClose={() => setIsExpanded(false)}
      title={`${selectedMetricData?.label} Trend - Detailed View`}
      description="Last 7 days performance analysis"
    >
      <div className="space-y-4">
        {/* Trend Analysis */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Start Value</p>
            <p className="text-2xl font-bold">
              {trendData[0][selectedMetric].toFixed(2)}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">End Value</p>
            <p className="text-2xl font-bold">
              {trendData[trendData.length - 1][selectedMetric].toFixed(2)}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Change</p>
            <p className="text-2xl font-bold">
              {((trendData[trendData.length - 1][selectedMetric] - trendData[0][selectedMetric]) / trendData[0][selectedMetric] * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-2xl font-bold">
              {(trendData.reduce((sum, day) => sum + day[selectedMetric], 0) / trendData.length).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Expanded Chart */}
        <ChartContent height={300} showGrid={true} />

        {/* Comparison Chart */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">All Metrics Comparison</h3>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: '225px' }}
          >
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={50}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              {availableMetrics.map((metric) => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  opacity={metric.key === selectedMetric ? 1 : 0.3}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Daily Values</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Day</th>
                  {availableMetrics.map((metric) => (
                    <th key={metric.key} className="text-right py-2 px-3">{metric.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trendData.map((day) => (
                  <tr key={day.day} className="border-b">
                    <td className="py-2 px-3 font-medium">{day.day}</td>
                    {availableMetrics.map((metric) => (
                      <td key={metric.key} className="text-right py-2 px-3">
                        {day[metric.key].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ChartModal>
    </>
  );
}