import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Download, Eye, Send, Settings, FileText, Building2 } from 'lucide-react';
import InvoiceGenerator from './InvoiceGenerator';
import CompanySettings from './CompanySettings';

const InvoicesTab = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [invoices] = useState([
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      clientName: 'InnovateTech Ltd',
      revenue: 24500,
      agencyFee: 2450,
      totalAmount: 2695,
      status: 'paid',
      dateRange: 'Jan 1 - Jan 31, 2024',
      issueDate: '2024-01-15',
      dueDate: '2024-02-14'
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      clientName: 'ShopFast Inc',
      revenue: 18920,
      agencyFee: 1892,
      totalAmount: 2081,
      status: 'sent',
      dateRange: 'Jan 1 - Jan 31, 2024',
      issueDate: '2024-01-20',
      dueDate: '2024-02-19'
    },
    {
      id: '3',
      invoiceNumber: 'INV-2024-003',
      clientName: 'TechStart Solutions',
      revenue: 32000,
      agencyFee: 3200,
      totalAmount: 3520,
      status: 'draft',
      dateRange: 'Feb 1 - Feb 29, 2024',
      issueDate: '2024-02-01',
      dueDate: '2024-03-02'
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          <p className="text-muted-foreground">Create, manage, and track client invoices</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Generator
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Invoice History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Company Settings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Invoice Generator Tab */}
        <TabsContent value="generator" className="space-y-6">
          <InvoiceGenerator />
        </TabsContent>

        {/* Invoice History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-blue-700">
                <Eye className="h-5 w-5" />
                Invoice History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Agency Fee</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.agencyFee)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <CompanySettings />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                  <Building2 className="h-5 w-5" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.revenue, 0))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  From {invoices.length} invoices
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
                  <FileText className="h-5 w-5" />
                  Agency Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.agencyFee, 0))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Average {formatCurrency(invoices.reduce((sum, inv) => sum + inv.agencyFee, 0) / invoices.length)}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
                  <Send className="h-5 w-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Paid:</span>
                    <Badge className="bg-green-100 text-green-800">
                      {invoices.filter(inv => inv.status === 'paid').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sent:</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {invoices.filter(inv => inv.status === 'sent').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Draft:</span>
                    <Badge variant="secondary">
                      {invoices.filter(inv => inv.status === 'draft').length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-orange-700">
                <Building2 className="h-5 w-5" />
                Invoice Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">
                  Advanced invoice analytics and reporting features will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoicesTab;