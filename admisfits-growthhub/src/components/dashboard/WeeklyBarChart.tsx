import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Expand } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChartModal } from "@/components/ui/chart-modal";

interface WeeklyBarChartProps {
  className?: string;
}

const availableMetrics = [
  { key: "leads", label: "Leads", color: "rgb(14, 116, 144)" },
  { key: "conversions", label: "Conversions", color: "rgb(5, 150, 105)" },
  { key: "calls", label: "Calls", color: "rgb(16, 185, 129)" },
  { key: "appointments", label: "Appointments", color: "rgb(6, 182, 212)" },
];

const chartConfig = {
  leads: {
    label: "Leads",
    color: "rgb(14, 116, 144)",
  },
  conversions: {
    label: "Conversions",
    color: "rgb(5, 150, 105)",
  },
  calls: {
    label: "Calls",
    color: "rgb(16, 185, 129)",
  },
  appointments: {
    label: "Appointments",
    color: "rgb(6, 182, 212)",
  },
} satisfies ChartConfig;

// Sample weekly data starting from Monday
const weeklyData = [
  { day: "Mon", leads: 12, conversions: 3, calls: 8, appointments: 5 },
  { day: "Tue", leads: 15, conversions: 4, calls: 10, appointments: 7 },
  { day: "Wed", leads: 18, conversions: 5, calls: 12, appointments: 8 },
  { day: "Thu", leads: 14, conversions: 3, calls: 9, appointments: 6 },
  { day: "Fri", leads: 22, conversions: 6, calls: 15, appointments: 10 },
  { day: "Sat", leads: 8, conversions: 2, calls: 5, appointments: 3 },
  { day: "Sun", leads: 6, conversions: 1, calls: 3, appointments: 2 },
];

export function WeeklyBarChart({ className }: WeeklyBarChartProps) {
  const [selectedMetric, setSelectedMetric] = React.useState("leads");
  const [isExpanded, setIsExpanded] = React.useState(false);

  const selectedMetricData = availableMetrics.find(m => m.key === selectedMetric);

  const ChartContent = ({ height = 200, showLabels = false }: { height?: number; showLabels?: boolean }) => (
    <ChartContainer
      config={chartConfig}
      className={`aspect-auto w-full`}
      style={{ height: `${height}px` }}
    >
      <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 10, bottom: showLabels ? 40 : 10 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          angle={showLabels ? -45 : 0}
          textAnchor={showLabels ? "end" : "middle"}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={showLabels ? 50 : 30}
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
        <Bar
          dataKey={selectedMetric}
          fill={selectedMetricData?.color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );

  return (
    <>
      <Card className={className} onDoubleClick={() => setIsExpanded(true)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Weekly {selectedMetricData?.label || "Leads"}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Starting from Monday this week
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
      title={`Weekly ${selectedMetricData?.label || "Leads"} - Detailed View`}
      description="Starting from Monday this week"
    >
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">
              {weeklyData.reduce((sum, day) => sum + day[selectedMetric], 0)}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-2xl font-bold">
              {Math.round(weeklyData.reduce((sum, day) => sum + day[selectedMetric], 0) / weeklyData.length)}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Peak Day</p>
            <p className="text-2xl font-bold">
              {weeklyData.reduce((max, day) => day[selectedMetric] > max.value ? { day: day.day, value: day[selectedMetric] } : max, { day: '', value: 0 }).day}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Peak Value</p>
            <p className="text-2xl font-bold">
              {weeklyData.reduce((max, day) => Math.max(max, day[selectedMetric]), 0)}
            </p>
          </div>
        </div>

        {/* Expanded Chart */}
        <ChartContent height={300} showLabels={true} />

        {/* Data Table */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Daily Breakdown</h3>
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
                {weeklyData.map((day) => (
                  <tr key={day.day} className="border-b">
                    <td className="py-2 px-3 font-medium">{day.day}</td>
                    {availableMetrics.map((metric) => (
                      <td key={metric.key} className="text-right py-2 px-3">
                        {day[metric.key]}
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