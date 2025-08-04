import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MousePointer, ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react';

interface FunnelStage {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: any;
  description: string;
}

interface ProjectFunnelChartProps {
  data: FunnelStage[];
  title?: string;
}

export default function ProjectFunnelChart({ data, title = "Conversion Funnel" }: ProjectFunnelChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          {data.map((stage, index) => (
            <div key={stage.name} className="w-full flex items-start gap-4">
              {/* Stage Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                   style={{ backgroundColor: stage.color }}>
                {String(index + 1).padStart(2, '0')}
              </div>
              
              {/* Funnel Segment */}
              <div className="flex-1 flex items-center gap-4">
                <div 
                  className="rounded-lg text-white font-medium text-sm flex items-center justify-center transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ 
                    backgroundColor: stage.color,
                    width: `${100 - (index * 15)}%`,
                    height: '60px',
                    minWidth: '120px'
                  }}
                >
                  {/* Gradient overlay for 3D effect */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, ${stage.color} 0%, ${stage.color}dd 50%, ${stage.color}aa 100%)`
                    }}
                  />
                  
                  {/* Text content */}
                  <div className="relative z-10 text-center">
                    <div className="font-bold">{stage.name}</div>
                    <div className="text-xs opacity-90">{stage.value.toLocaleString()}</div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="flex-1 max-w-xs">
                  <div className="font-medium text-sm mb-1" style={{ color: stage.color }}>
                    {stage.name}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {stage.description}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">
                    {stage.percentage.toFixed(2)}% conversion rate
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Bottom triangle tip */}
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-300" />
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