import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MousePointer, ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react';

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: any;
}

interface ProjectFunnelChartProps {
  data: FunnelStage[];
  title?: string;
}

export default function ProjectFunnelChart({ data, title = "Conversion Funnel" }: ProjectFunnelChartProps) {
  const maxValue = Math.max(...data.map(stage => stage.value));
  const maxPercentage = Math.max(...data.map(stage => stage.percentage));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((stage, index) => {
            const heightRatio = (stage.value / maxValue) * 100;
            const widthRatio = (stage.percentage / maxPercentage) * 100;
            
            return (
              <div key={stage.name} className="relative">
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                      <stage.icon className="h-4 w-4" style={{ color: stage.color }} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {stage.percentage.toFixed(2)}% conversion rate
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {stage.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stage.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Funnel Bar */}
                <div className="relative">
                  <div 
                    className="rounded-lg transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ 
                      height: `${Math.max(20, heightRatio * 0.8)}px`,
                      backgroundColor: stage.color,
                      opacity: 0.9
                    }}
                  >
                    {/* Gradient overlay */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}80 100%)`
                      }}
                    />
                    
                    {/* Percentage indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {stage.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Width indicator line */}
                  <div 
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-300"
                    style={{ 
                      left: `${100 - widthRatio}%`,
                      zIndex: 10
                    }}
                  />
                </div>

                {/* Drop indicator */}
                {index < data.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <div className="w-0.5 h-4 bg-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {((data[data.length - 1]?.percentage / data[0]?.percentage) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">Overall Conversion</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {data[0]?.value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total Impressions</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 