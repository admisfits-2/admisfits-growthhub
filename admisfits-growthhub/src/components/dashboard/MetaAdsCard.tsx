import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Phone, 
  Calendar,
  ShoppingCart,
  TrendingUp,
  Eye,
  MousePointerClick,
  Play
} from 'lucide-react';
import { MetaAd } from '@/lib/services/metaAdsService';

interface MetaAdsCardProps {
  ad: MetaAd;
}

export function MetaAdsCard({ ad }: MetaAdsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getRankingColor = (ranking: string) => {
    switch (ranking?.toLowerCase()) {
      case 'above_average':
        return 'text-green-600';
      case 'average':
        return 'text-yellow-600';
      case 'below_average':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getRankingBadge = (ranking: string) => {
    switch (ranking?.toLowerCase()) {
      case 'above_average':
        return <Badge variant="outline" className="text-green-600 border-green-600">Above Average</Badge>;
      case 'average':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Average</Badge>;
      case 'below_average':
        return <Badge variant="outline" className="text-red-600 border-red-600">Below Average</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-border shadow-md hover:shadow-lg hover:border-primary/20 transition-all duration-200">
      {/* Ad Preview */}
      <div className="relative bg-gradient-to-br from-muted/20 to-muted/40 min-h-[250px] flex items-center justify-center p-2">
        {ad.creative.video_id ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={ad.creative.thumbnail_url || 'https://via.placeholder.com/500x500?text=Video+Ad'} 
              alt={ad.name}
              className="max-w-full max-h-[240px] w-auto h-auto object-contain rounded-md"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm rounded-full p-3 shadow-lg">
                <Play className="h-7 w-7 text-white fill-white" />
              </div>
            </div>
          </div>
        ) : (
          <img 
            src={ad.creative.image_url || ad.creative.thumbnail_url || 'https://via.placeholder.com/500x500?text=Ad+Preview'} 
            alt={ad.name}
            className="max-w-full max-h-[240px] w-auto h-auto object-contain rounded-md"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        )}
        
        {/* Quality Ranking Badge */}
        {ad.metrics.quality_ranking !== 'unknown' && (
          <div className="absolute top-3 right-3">
            {getRankingBadge(ad.metrics.quality_ranking)}
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Ad Name and Campaign */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1" title={ad.name}>
              {ad.name}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {ad.campaign_name || 'Unknown Campaign'}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 bg-primary/5">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatCurrency(ad.metrics.spend)}
          </Badge>
        </div>

        {/* Creative Text */}
        {(ad.creative.title || ad.creative.body) && (
          <div className="space-y-1 py-2 border-y">
            {ad.creative.title && (
              <p className="font-medium text-sm line-clamp-1">{ad.creative.title}</p>
            )}
            {ad.creative.body && (
              <p className="text-xs text-muted-foreground line-clamp-2">{ad.creative.body}</p>
            )}
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 bg-muted/20 rounded-lg p-3">
          {/* Revenue */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Revenue</span>
            </div>
            <p className="font-semibold text-sm pl-5">{formatCurrency(ad.metrics.revenue || 0)}</p>
          </div>

          {/* Appointments */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Appointments</span>
            </div>
            <p className="font-semibold text-sm pl-5">{ad.metrics.appointments || 0}</p>
          </div>

          {/* Calls */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Calls</span>
            </div>
            <p className="font-semibold text-sm pl-5">{ad.metrics.calls || 0}</p>
          </div>

          {/* Purchases */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Purchases</span>
            </div>
            <p className="font-semibold text-sm pl-5">{ad.metrics.purchases || 0}</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
          {/* Impressions */}
          <div className="text-center px-2 py-1 rounded bg-muted/10">
            <p className="text-xs text-muted-foreground font-medium">Impressions</p>
            <p className="font-semibold text-sm mt-0.5">{formatNumber(ad.metrics.impressions)}</p>
          </div>

          {/* CTR */}
          <div className="text-center px-2 py-1 rounded bg-muted/10">
            <p className="text-xs text-muted-foreground font-medium">CTR</p>
            <p className="font-semibold text-sm mt-0.5">{ad.metrics.ctr.toFixed(2)}%</p>
          </div>

          {/* ROAS */}
          <div className="text-center px-2 py-1 rounded bg-muted/10">
            <p className="text-xs text-muted-foreground font-medium">ROAS</p>
            <p className="font-semibold text-sm mt-0.5">
              {ad.metrics.roas > 0 ? ad.metrics.roas.toFixed(2) : '-'}
            </p>
          </div>
        </div>

        {/* Performance Indicators */}
        {(ad.metrics.purchases > 0 || ad.metrics.video_play_actions > 0) && (
          <div className="flex gap-2 pt-2">
            {ad.metrics.purchases > 0 && (
              <Badge variant="secondary" className="text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" />
                {ad.metrics.purchases} Purchases
              </Badge>
            )}
            
            {ad.metrics.video_play_actions > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Play className="h-3 w-3 mr-1" />
                {formatNumber(ad.metrics.video_play_actions)} Views
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}