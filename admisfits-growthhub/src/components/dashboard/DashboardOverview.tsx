import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const DashboardOverview = () => {
  // Mock data - will be replaced with real data from Supabase
  const stats = [
    {
      title: 'Total Revenue',
      value: '$124,350',
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Ad Spend',
      value: '$98,240',
      change: '+8.1%',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Overall ROI',
      value: '265%',
      change: '+4.2%',
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: 'Total Leads',
      value: '2,847',
      change: '+15.3%',
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  const overviewData = [
    { month: 'Jan', desktop: 186, mobile: 80 },
    { month: 'Feb', desktop: 305, mobile: 200 },
    { month: 'Mar', desktop: 237, mobile: 120 },
    { month: 'Apr', desktop: 73, mobile: 190 },
    { month: 'May', desktop: 209, mobile: 130 },
    { month: 'Jun', desktop: 214, mobile: 140 },
  ];

  const barData = [
    { name: 'Mon', leads: 32 },
    { name: 'Tue', leads: 51 },
    { name: 'Wed', leads: 45 },
    { name: 'Thu', leads: 62 },
    { name: 'Fri', leads: 39 },
    { name: 'Sat', leads: 28 },
    { name: 'Sun', leads: 22 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to your growth marketing dashboard</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.color}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-64"
              config={{
                desktop: { label: 'Desktop', color: 'hsl(var(--primary))' },
                mobile: { label: 'Mobile', color: 'hsl(var(--accent))' },
              }}
            >
              <AreaChart data={overviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="desktop" stroke="var(--color-desktop)" fill="var(--color-desktop)" fillOpacity={0.6} />
                <Area type="monotone" dataKey="mobile" stroke="var(--color-mobile)" fill="var(--color-mobile)" fillOpacity={0.4} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-64"
              config={{
                leads: { label: 'Leads', color: 'hsl(var(--primary))' },
              }}
            >
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="leads" fill="var(--color-leads)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tech Startup Campaign</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$12,450</p>
                  <p className="text-sm text-green-600">ROI: 285%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-commerce Store</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$8,920</p>
                  <p className="text-sm text-green-600">ROI: 312%</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SaaS Platform</p>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$5,670</p>
                  <p className="text-sm text-green-600">ROI: 198%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg. Cost per Lead</span>
                <span className="font-medium">$34.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg. Close Rate</span>
                <span className="font-medium">12.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Projects</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">This Month Revenue</span>
                <span className="font-medium text-green-600">$47,250</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;