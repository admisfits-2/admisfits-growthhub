import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, Eye, Send } from 'lucide-react';

const InvoicesTab = () => {
  const [invoices] = useState([
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      clientName: 'InnovateTech Ltd',
      revenue: 24500,
      agencyFee: 2450,
      totalAmount: 2695,
      status: 'paid',
      dateRange: 'Jan 1 - Jan 31, 2024'
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      clientName: 'ShopFast Inc',
      revenue: 18920,
      agencyFee: 1892,
      totalAmount: 2081,
      status: 'sent',
      dateRange: 'Jan 1 - Jan 31, 2024'
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <p className="text-muted-foreground">Create and manage client invoices</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate New Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <select className="w-full px-3 py-2 border border-input rounded-md">
                <option value="">Choose a project...</option>
                <option value="1">Tech Startup Campaign</option>
                <option value="2">E-commerce Store</option>
                <option value="3">SaaS Platform</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateStart">Date Range Start</Label>
                <Input id="dateStart" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEnd">Date Range End</Label>
                <Input id="dateEnd" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input id="clientName" placeholder="Auto-populated from project" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue Generated</Label>
                <Input id="revenue" placeholder="$0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adSpend">Ad Spend</Label>
                <Input id="adSpend" placeholder="$0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agencyFee">Agency Fee (%)</Label>
                <Input id="agencyFee" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" defaultValue="0" />
              </div>
            </div>
            <Button className="w-full">Generate Invoice</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">AdmisFits Marketing</h3>
                <p className="text-sm text-muted-foreground">Growth Marketing Agency</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Revenue Generated:</span>
                  <span className="font-medium">$24,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Ad Spend:</span>
                  <span className="font-medium">$8,650.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Agency Fee (10%):</span>
                  <span className="font-medium">$2,450.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tax (10%):</span>
                  <span className="font-medium">$245.00</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total Amount:</span>
                  <span>$2,695.00</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date Range</TableHead>
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
                  <TableCell>{invoice.dateRange}</TableCell>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesTab;