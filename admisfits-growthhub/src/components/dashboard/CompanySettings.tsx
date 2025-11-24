import { useState } from 'react';
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
  Settings, 
  Upload, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Palette,
  FileText,
  Save,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompanyDetails {
  name: string;
  tagline: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  tax: {
    taxId: string;
    taxRate: number;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  invoice: {
    prefix: string;
    nextNumber: number;
    terms: string;
    footer: string;
  };
}

const defaultCompanyDetails: CompanyDetails = {
  name: 'AdmisFits Marketing',
  tagline: 'Growth Marketing Agency',
  address: {
    street: '123 Marketing Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'United States'
  },
  contact: {
    email: 'hello@admisfits.com',
    phone: '+1 (555) 123-4567',
    website: 'https://admisfits.com'
  },
  tax: {
    taxId: '12-3456789',
    taxRate: 0
  },
  branding: {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    fontFamily: 'Inter'
  },
  invoice: {
    prefix: 'INV',
    nextNumber: 1001,
    terms: 'Payment is due within 30 days of invoice date. Late payments may incur additional fees.',
    footer: 'Thank you for your business!'
  }
};

export default function CompanySettings() {
  const { toast } = useToast();
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(defaultCompanyDetails);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
        setCompanyDetails(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateCompanyDetails = (field: string, value: any) => {
    setCompanyDetails(prev => {
      const newDetails = { ...prev };
      const keys = field.split('.');
      let current: any = newDetails;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newDetails;
    });
  };

  const saveSettings = () => {
    // Here you would save to your database
    toast({
      title: "Settings Saved",
      description: "Company settings have been updated successfully.",
    });
  };

  const generateInvoicePreview = () => {
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-blue-700">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-4">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 200x200px, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={companyDetails.name}
                  onChange={(e) => updateCompanyDetails('name', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input
                  value={companyDetails.tagline}
                  onChange={(e) => updateCompanyDetails('tagline', e.target.value)}
                  placeholder="Enter company tagline"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-green-700">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={companyDetails.contact.email}
                  onChange={(e) => updateCompanyDetails('contact.email', e.target.value)}
                  placeholder="hello@company.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={companyDetails.contact.phone}
                  onChange={(e) => updateCompanyDetails('contact.phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={companyDetails.contact.website}
                  onChange={(e) => updateCompanyDetails('contact.website', e.target.value)}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={companyDetails.address.street}
                  onChange={(e) => updateCompanyDetails('address.street', e.target.value)}
                  placeholder="123 Business Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={companyDetails.address.city}
                    onChange={(e) => updateCompanyDetails('address.city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={companyDetails.address.state}
                    onChange={(e) => updateCompanyDetails('address.state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={companyDetails.address.zipCode}
                    onChange={(e) => updateCompanyDetails('address.zipCode', e.target.value)}
                    placeholder="10001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={companyDetails.address.country}
                    onChange={(e) => updateCompanyDetails('address.country', e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-purple-700">
            <FileText className="h-5 w-5" />
            Tax & Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tax ID / EIN</Label>
                <Input
                  value={companyDetails.tax.taxId}
                  onChange={(e) => updateCompanyDetails('tax.taxId', e.target.value)}
                  placeholder="12-3456789"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Tax Rate (%)</Label>
                <Input
                  value={companyDetails.tax.taxRate}
                  onChange={(e) => updateCompanyDetails('tax.taxRate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Invoice Number Prefix</Label>
                <Input
                  value={companyDetails.invoice.prefix}
                  onChange={(e) => updateCompanyDetails('invoice.prefix', e.target.value)}
                  placeholder="INV"
                />
              </div>
              <div className="space-y-2">
                <Label>Next Invoice Number</Label>
                <Input
                  value={companyDetails.invoice.nextNumber}
                  onChange={(e) => updateCompanyDetails('invoice.nextNumber', parseInt(e.target.value) || 1001)}
                  placeholder="1001"
                  type="number"
                  min="1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding & Design */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-red-50">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-orange-700">
            <Palette className="h-5 w-5" />
            Branding & Design
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={companyDetails.branding.primaryColor}
                    onChange={(e) => updateCompanyDetails('branding.primaryColor', e.target.value)}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <Input
                    value={companyDetails.branding.primaryColor}
                    onChange={(e) => updateCompanyDetails('branding.primaryColor', e.target.value)}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={companyDetails.branding.secondaryColor}
                    onChange={(e) => updateCompanyDetails('branding.secondaryColor', e.target.value)}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <Input
                    value={companyDetails.branding.secondaryColor}
                    onChange={(e) => updateCompanyDetails('branding.secondaryColor', e.target.value)}
                    placeholder="#1e40af"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={companyDetails.branding.fontFamily}
                  onValueChange={(value) => updateCompanyDetails('branding.fontFamily', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Open Sans">Open Sans</SelectItem>
                    <SelectItem value="Lato">Lato</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Terms & Footer */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-teal-700">
            <FileText className="h-5 w-5" />
            Invoice Terms & Footer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea
                value={companyDetails.invoice.terms}
                onChange={(e) => updateCompanyDetails('invoice.terms', e.target.value)}
                placeholder="Payment is due within 30 days of invoice date..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Footer</Label>
              <Textarea
                value={companyDetails.invoice.footer}
                onChange={(e) => updateCompanyDetails('invoice.footer', e.target.value)}
                placeholder="Thank you for your business!"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={generateInvoicePreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview Invoice
        </Button>
        <Button onClick={saveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Preview how your invoice will look with current settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg p-8 shadow-lg">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                {companyDetails.logo && (
                  <img 
                    src={companyDetails.logo} 
                    alt="Company Logo" 
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: companyDetails.branding.primaryColor }}>
                    {companyDetails.name}
                  </h1>
                  <p className="text-gray-600">{companyDetails.tagline}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold mb-2">INVOICE</h2>
                <p className="text-sm text-gray-600">#{companyDetails.invoice.prefix}-{companyDetails.invoice.nextNumber}</p>
                <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Company & Client Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-2">From:</h3>
                <div className="text-sm">
                  <p className="font-medium">{companyDetails.name}</p>
                  <p>{companyDetails.address.street}</p>
                  <p>{companyDetails.address.city}, {companyDetails.address.state} {companyDetails.address.zipCode}</p>
                  <p>{companyDetails.address.country}</p>
                  <p className="mt-2">{companyDetails.contact.email}</p>
                  <p>{companyDetails.contact.phone}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">To:</h3>
                <div className="text-sm">
                  <p className="font-medium">Client Name</p>
                  <p>Client Address</p>
                  <p>Client City, State ZIP</p>
                  <p>client@email.com</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2" style={{ borderColor: companyDetails.branding.primaryColor }}>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">Marketing Services - January 2024</td>
                    <td className="text-right py-3">$2,450.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>$2,450.00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax ({companyDetails.tax.taxRate}%):</span>
                  <span>${(2450 * companyDetails.tax.taxRate / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg border-t-2" style={{ borderColor: companyDetails.branding.primaryColor }}>
                  <span>Total:</span>
                  <span>${(2450 * (1 + companyDetails.tax.taxRate / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Terms & Footer */}
            <div className="text-sm text-gray-600">
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Payment Terms:</h4>
                <p>{companyDetails.invoice.terms}</p>
              </div>
              <div className="text-center">
                <p>{companyDetails.invoice.footer}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 