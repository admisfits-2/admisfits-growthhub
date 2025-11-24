import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Download, 
  Send, 
  Eye, 
  Calculator,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  terms: string;
}

interface CompanySettings {
  name: string;
  tagline: string;
  logo?: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  primaryColor: string;
  taxId: string;
}

const defaultCompanySettings: CompanySettings = {
  name: 'AdmisFits Marketing',
  tagline: 'Growth Marketing Agency',
  address: '123 Marketing Street, New York, NY 10001',
  email: 'hello@admisfits.com',
  phone: '+1 (555) 123-4567',
  website: 'https://admisfits.com',
  primaryColor: '#3b82f6',
  taxId: '12-3456789'
};

export default function InvoiceGenerator() {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: 'INV-2024-1001',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    items: [
      {
        id: '1',
        description: 'Marketing Services',
        quantity: 1,
        rate: 2450,
        amount: 2450
      }
    ],
    subtotal: 2450,
    taxRate: 0,
    taxAmount: 0,
    total: 2450,
    notes: '',
    terms: 'Payment is due within 30 days of invoice date.'
  });

  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const updateInvoiceData = (field: string, value: any) => {
    setInvoiceData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      // Recalculate totals if items or tax rate changed
      if (field.includes('items') || field === 'taxRate') {
        const { subtotal, taxAmount, total } = calculateTotals(newData.items, newData.taxRate);
        newData.subtotal = subtotal;
        newData.taxAmount = taxAmount;
        newData.total = total;
      }
      
      return newData;
    });
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    updateInvoiceData('items', [...invoiceData.items, newItem]);
  };

  const removeInvoiceItem = (id: string) => {
    const updatedItems = invoiceData.items.filter(item => item.id !== id);
    updateInvoiceData('items', updatedItems);
  };

  const updateInvoiceItem = (id: string, field: string, value: any) => {
    const updatedItems = invoiceData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    });
    updateInvoiceData('items', updatedItems);
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}-${month}-${random}`;
  };

  const downloadPDF = () => {
    // Here you would implement PDF generation
    toast({
      title: "PDF Download",
      description: "Invoice PDF is being generated...",
    });
  };

  const sendInvoice = () => {
    // Here you would implement email sending
    toast({
      title: "Invoice Sent",
      description: "Invoice has been sent to the client.",
    });
  };

  const copyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoiceData.invoiceNumber);
    toast({
      title: "Copied",
      description: "Invoice number copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <p className="text-muted-foreground">Create professional invoices for your clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Company Settings
          </Button>
          <Button onClick={() => setIsPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Invoice Form */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-blue-700">
              <FileText className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => updateInvoiceData('invoiceNumber', e.target.value)}
                    />
                    <Button variant="outline" size="icon" onClick={copyInvoiceNumber}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={invoiceData.issueDate}
                    onChange={(e) => updateInvoiceData('issueDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Client Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input
                      value={invoiceData.clientName}
                      onChange={(e) => updateInvoiceData('clientName', e.target.value)}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={(e) => updateInvoiceData('clientEmail', e.target.value)}
                      placeholder="client@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Address</Label>
                    <Textarea
                      value={invoiceData.clientAddress}
                      onChange={(e) => updateInvoiceData('clientAddress', e.target.value)}
                      placeholder="Enter client address"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Invoice Items</h3>
                  <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {invoiceData.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvoiceItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                          placeholder="Enter item description"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate ($)</Label>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateInvoiceItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount ($)</Label>
                          <Input
                            value={item.amount.toFixed(2)}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Totals</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">${invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Rate (%):</span>
                    <Input
                      type="number"
                      value={invoiceData.taxRate}
                      onChange={(e) => updateInvoiceData('taxRate', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Amount:</span>
                    <span className="font-medium">${invoiceData.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={invoiceData.notes}
                    onChange={(e) => updateInvoiceData('notes', e.target.value)}
                    placeholder="Additional notes for the client"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Textarea
                    value={invoiceData.terms}
                    onChange={(e) => updateInvoiceData('terms', e.target.value)}
                    placeholder="Payment terms and conditions"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-green-700">
                <Calculator className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Button className="w-full" onClick={() => updateInvoiceData('invoiceNumber', generateInvoiceNumber())}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice Number
                </Button>
                <Button variant="outline" className="w-full" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" className="w-full" onClick={sendInvoice}>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Client
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-purple-700">
                <DollarSign className="h-5 w-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice Number:</span>
                  <span className="font-medium">{invoiceData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Client:</span>
                  <span className="font-medium">{invoiceData.clientName || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items:</span>
                  <span className="font-medium">{invoiceData.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax:</span>
                  <span className="font-medium">${invoiceData.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Preview your invoice before sending to the client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg p-8 shadow-lg">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                {companySettings.logo && (
                  <img 
                    src={companySettings.logo} 
                    alt="Company Logo" 
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: companySettings.primaryColor }}>
                    {companySettings.name}
                  </h1>
                  <p className="text-gray-600">{companySettings.tagline}</p>
                  <p className="text-sm text-gray-500 mt-1">{companySettings.address}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold mb-2">INVOICE</h2>
                <p className="text-sm text-gray-600">#{invoiceData.invoiceNumber}</p>
                <p className="text-sm text-gray-600">Date: {new Date(invoiceData.issueDate).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600">Due: {new Date(invoiceData.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <div className="text-sm">
                  <p className="font-medium">{invoiceData.clientName || 'Client Name'}</p>
                  <p>{invoiceData.clientEmail || 'client@email.com'}</p>
                  <p className="whitespace-pre-line">{invoiceData.clientAddress || 'Client Address'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">From:</h3>
                <div className="text-sm">
                  <p className="font-medium">{companySettings.name}</p>
                  <p>{companySettings.email}</p>
                  <p>{companySettings.phone}</p>
                  <p>{companySettings.website}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: companySettings.primaryColor }}>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.description}</td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">${item.rate.toFixed(2)}</td>
                      <td className="text-right py-3">${item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax ({invoiceData.taxRate}%):</span>
                  <span>${invoiceData.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg border-t-2" style={{ borderColor: companySettings.primaryColor }}>
                  <span>Total:</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="text-sm text-gray-600">
              {invoiceData.notes && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Notes:</h4>
                  <p>{invoiceData.notes}</p>
                </div>
              )}
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Payment Terms:</h4>
                <p>{invoiceData.terms}</p>
              </div>
              <div className="text-center">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Company Settings</DialogTitle>
            <DialogDescription>
              Configure your company information for invoices.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companySettings.name}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={companySettings.tagline}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, tagline: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={companySettings.address}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={companySettings.website}
                onChange={(e) => setCompanySettings(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={companySettings.primaryColor}
                  onChange={(e) => setCompanySettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 border rounded cursor-pointer"
                />
                <Input
                  value={companySettings.primaryColor}
                  onChange={(e) => setCompanySettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 