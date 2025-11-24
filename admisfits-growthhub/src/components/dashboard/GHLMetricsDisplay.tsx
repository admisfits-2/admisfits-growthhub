// GHL Metrics Display Component
// Shows GHL-specific metrics in the project overview

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Target, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { GHLDashboardMetrics } from '@/types/ghlIntegration';
import { formatMetricValue, getTrend } from '@/hooks/useProjectMetricsWithGHL';

interface GHLMetricsDisplayProps {
  metrics: GHLDashboardMetrics;
  isLoading?: boolean;
  className?: string;
}

const GHLMetricsDisplay: React.FC<GHLMetricsDisplayProps> = ({
  metrics,
  isLoading = false,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const appointmentCompletionRate = metrics.appointments.total > 0 
    ? (metrics.appointments.completed / metrics.appointments.total) * 100 
    : 0;

  const dealConversionRate = metrics.opportunities.total > 0 
    ? (metrics.opportunities.won / metrics.opportunities.total) * 100 
    : 0;

  const averageDealValue = metrics.opportunities.won > 0 
    ? metrics.opportunities.won_value / metrics.opportunities.won 
    : 0;

  const ghlMetricCards = [
    {
      title: 'Total Appointments',
      value: metrics.appointments.total,
      icon: Calendar,
      color: 'bg-blue-500',
      subMetrics: [
        { label: 'Completed', value: metrics.appointments.completed, icon: CheckCircle },
        { label: 'No Show', value: metrics.appointments.no_show, icon: XCircle },
        { label: 'Cancelled', value: metrics.appointments.cancelled, icon: Clock },
      ]
    },
    {
      title: 'Deals Pipeline',
      value: metrics.opportunities.total,
      icon: Target,
      color: 'bg-purple-500',
      subMetrics: [
        { label: 'Won', value: metrics.opportunities.won, icon: CheckCircle },
        { label: 'Open', value: metrics.opportunities.open, icon: Clock },
        { label: 'Lost', value: metrics.opportunities.lost, icon: XCircle },
      ]
    },
    {
      title: 'Total Revenue',
      value: metrics.revenue.total,
      icon: DollarSign,
      color: 'bg-green-500',
      formatType: 'currency',
      subMetrics: [
        { label: 'From Deals', value: metrics.revenue.opportunities, icon: Target },
        { label: 'From Invoices', value: metrics.revenue.invoices, icon: DollarSign },
      ]
    },
    {
      title: 'Performance Rates',
      value: appointmentCompletionRate,
      icon: TrendingUp,
      color: 'bg-orange-500',
      formatType: 'percentage',
      subMetrics: [
        { label: 'Appointment Rate', value: appointmentCompletionRate, formatType: 'percentage' },
        { label: 'Deal Conversion', value: dealConversionRate, formatType: 'percentage' },
        { label: 'Avg Deal Value', value: averageDealValue, formatType: 'currency' },
      ]
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">GHL Metrics</h3>
        <Badge variant="secondary" className="text-xs">
          Go High Level
        </Badge>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ghlMetricCards.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${metric.color}`}>
                <metric.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {metric.formatType === 'currency' 
                  ? formatMetricValue(metric.value, 'currency')
                  : metric.formatType === 'percentage'
                  ? formatMetricValue(metric.value, 'percentage')
                  : formatMetricValue(metric.value, 'number')
                }
              </div>
              
              {/* Sub-metrics */}
              <div className="space-y-1">
                {metric.subMetrics.map((subMetric, subIndex) => (
                  <div key={subIndex} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <subMetric.icon className="h-3 w-3" />
                      <span>{subMetric.label}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {subMetric.formatType === 'currency' 
                        ? formatMetricValue(subMetric.value, 'currency')
                        : subMetric.formatType === 'percentage'
                        ? formatMetricValue(subMetric.value, 'percentage')
                        : formatMetricValue(subMetric.value, 'number')
                      }
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Appointment Success Rate</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatMetricValue(appointmentCompletionRate, 'percentage')}
                </p>
              </div>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Deal Win Rate</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatMetricValue(dealConversionRate, 'percentage')}
                </p>
              </div>
              <div className="p-2 bg-purple-500 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Avg Deal Value</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatMetricValue(averageDealValue, 'currency')}
                </p>
              </div>
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GHLMetricsDisplay;