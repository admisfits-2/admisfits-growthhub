import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { format, parseISO, isValid } from "date-fns";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { useMainProjectMetrics } from "@/hooks/useProjectMetrics";
import { startOfDay, endOfDay, subDays } from "date-fns";

export type RevenueDatum = {
  month: string;
  revenue: number;
  spend: number;
  profit?: number;
  conversions?: number;
  [key: string]: any;
};

interface RevenueAreaChartProps {
  data: RevenueDatum[];
  className?: string;
  projectId?: string;
}

const defaultColors = [
  "rgb(14, 116, 144)", // Deep teal
  "rgb(5, 150, 105)",  // Emerald
  "rgb(16, 185, 129)", // Green
  "rgb(6, 182, 212)",  // Cyan
  "rgb(34, 197, 94)",  // Lime
  "rgb(20, 184, 166)", // Teal
];

export function RevenueAreaChart({ data, className, projectId }: RevenueAreaChartProps) {
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
  const [selectedColors, setSelectedColors] = React.useState<string[]>(["rgb(14, 116, 144)"]);

  // Get main metrics if projectId is provided
  const dateRange = React.useMemo(() => {
    const now = new Date();
    return {
      from: startOfDay(subDays(now, 30)),
      to: endOfDay(now),
    };
  }, []);

  // Re-enable metrics hooks now that infinite loop is fixed
  const { mainMetrics = [] } = useMainProjectMetrics(projectId || '', dateRange);

  // Create available metrics from main metrics ONLY
  const availableMetrics = React.useMemo(() => {
    // Only use main metrics from dashboard configuration
    if (mainMetrics.length > 0) {
      return mainMetrics.map((metric, index) => ({
        key: metric.key,
        label: metric.config.metric_name || metric.config.display_name,
        color: defaultColors[index % defaultColors.length],
        stackId: String.fromCharCode(97 + index), // a, b, c, d...
      }));
    }

    // Return empty array if no main metrics configured
    return [];
  }, [mainMetrics]); // Keep original dependency but logs removed

  // Create dynamic chart config
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    availableMetrics.forEach(metric => {
      config[metric.key] = {
        label: metric.label,
        color: metric.color,
      };
    });
    return config;
  }, [availableMetrics]);

  // Initialize selected metrics when available metrics change
  React.useEffect(() => {
    if (availableMetrics.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics(availableMetrics.slice(0, 2).map(m => m.key));
    }
  }, [availableMetrics, selectedMetrics.length]);

  const filteredData = React.useMemo(() => {
    // Return all data
    return data;
  }, [data]);

  const handleMetricToggle = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-left">
          <CardTitle>Revenue & Performance</CardTitle>
          <CardDescription>
            {availableMetrics.length > 0 
              ? "Showing selected metrics for your project"
              : "No main metrics configured. Please configure main metrics in Settings tab."
            }
          </CardDescription>
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedMetrics.map(metricKey => {
              const metric = availableMetrics.find(m => m.key === metricKey);
              return metric ? (
                <Badge key={metricKey} variant="secondary" style={{ backgroundColor: `${metric.color}20`, color: metric.color }}>
                  {metric.label}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Metrics
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Select Metrics</h4>
                {availableMetrics.map(metric => (
                  <div key={metric.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.key}
                      checked={selectedMetrics.includes(metric.key)}
                      onCheckedChange={() => handleMetricToggle(metric.key)}
                    />
                    <label htmlFor={metric.key} className="text-sm font-normal cursor-pointer">
                      {metric.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <ColorPicker
            selectedColors={selectedColors}
            onColorsChange={setSelectedColors}
            maxColors={4}
          />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {availableMetrics.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No Metrics Configured</p>
              <p className="text-sm">Setting up default metrics...</p>
              <div className="text-xs opacity-75">
                If this persists, the database table may need to be created.
              </div>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
            <defs>
              {availableMetrics.map((metric, index) => {
                const metricColor = selectedColors[index % selectedColors.length] || metric.color;
                return (
                  <linearGradient key={`fill${metric.key}`} id={`fill${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={metricColor}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={metricColor}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={filteredData[0]?.date !== undefined ? "date" : "month"}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                // Try to parse as date and format as "Jun 5"
                try {
                  let date;
                  if (typeof value === 'string' && value.includes('-')) {
                    // Handle ISO date format like "2024-06-15"
                    date = parseISO(value);
                  } else if (typeof value === 'string') {
                    // Handle month names like "Jan", "Feb" or other date formats
                    if (value.length === 3 && !value.includes('-')) {
                      // It's likely a month abbreviation, convert to date
                      const currentYear = new Date().getFullYear();
                      date = new Date(`${value} 1, ${currentYear}`);
                    } else {
                      date = new Date(value);
                    }
                  } else {
                    return value;
                  }
                  
                  if (isValid(date)) {
                    return format(date, "MMM d");
                  }
                  return value;
                } catch {
                  return value;
                }
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return value;
                  }}
                  indicator="dot"
                />
              }
            />
            {availableMetrics.map((metric, index) => {
              const metricColor = selectedColors[index % selectedColors.length] || metric.color;
              return selectedMetrics.includes(metric.key) && data[0]?.[metric.key as keyof RevenueDatum] !== undefined && (
                <Area
                  key={metric.key}
                  dataKey={metric.key}
                  type="natural"
                  fill={`url(#fill${metric.key})`}
                  stroke={metricColor}
                  stackId={metric.stackId}
                />
              );
            })}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
} 