import { useState, useEffect } from 'react';
import { invoicesAPI, companiesAPI, quotationsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Receipt, Download, Loader2, Search, Trash2, MoreVertical, Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  // Form
  const [form, setForm] = useState({
    company_id: '',
    quotation_id: '',
    client_name: '',
    client_email: '',
    client_address: '',
    client_tax_id: '',
    items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }],
    tax_rate: 0,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCompany]);

  const fetchData = async () => {
    try {
      const [invRes, compRes] = await Promise.all([
        invoicesAPI.getAll({ 
          status: filterStatus || undefined,
          company_id: filterCompany || undefined
        }),
        companiesAPI.getAll()
      ]);
      setInvoices(invRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.client_name || form.items.length === 0) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    const validItems = form.items.filter(item => item.description && item.unit_price);
    if (validItems.length === 0) {
      toast.error('Agregue al menos un item válido');
      return;
    }

    setSaving(true);
    try {
      await invoicesAPI.create({
        ...form,
        items: validItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          discount: parseFloat(item.discount) || 0
        })),
        tax_rate: parseFloat(form.tax_rate) || 0
      });
      toast.success('Factura creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear factura');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await invoicesAPI.updateStatus(id, status);
      toast.success(`Estado actualizado a ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await invoicesAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const resetForm = () => {
    setForm({
      company_id: '',
      quotation_id: '',
      client_name: '',
      client_email: '',
      client_address: '',
      client_tax_id: '',
      items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }],
      tax_rate: 0,
      notes: ''
    });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { description: '', quantity: 1, unit_price: '', discount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (form.items.length > 1) {
      setForm({
        ...form,
        items: form.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  const calculateSubtotal = () => {
    return form.items.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount) || 0;
      return sum + (qty * price * (1 - discount / 100));
    }, 0);
  };

  const getStatusBadge = (status) => {
    const classes = {
      'Pendiente': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'Pagada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Anulada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return `status-badge ${classes[status] || ''}`;
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(search) ||
      inv.client_name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoices-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturas</h1>
          <p className="text-muted-foreground">Crea y gestiona facturas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-invoice-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Factura</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa Emisora *</Label>
                  <Select value={form.company_id} onValueChange={(value) => setForm({...form, company_id: value})}>
                    <SelectTrigger data-testid="inv-company-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>RUC/NIT del Cliente</Label>
                  <Input
                    value={form.client_tax_id}
                    onChange={(e) => setForm({...form, client_tax_id: e.target.value})}
                    placeholder="Número fiscal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Cliente *</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({...form, client_name: e.target.value})}
                    placeholder="Nombre o razón social"
                    data-testid="inv-client-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email del Cliente</Label>
                  <Input
                    type="email"
                    value={form.client_email}
                    onChange={(e) => setForm({...form, client_email: e.target.value})}
                    placeholder="cliente@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección del Cliente</Label>
                <Input
                  value={form.client_address}
                  onChange={(e) => setForm({...form, client_address: e.target.value})}
                  placeholder="Dirección completa"
                />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Item
                  </Button>
                </div>
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Servicio o producto"
                        data-testid={`inv-item-desc-${index}`}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Precio Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        placeholder="0.00"
                        data-testid={`inv-item-price-${index}`}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Desc. %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      {form.items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa de Impuesto (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.tax_rate}
                    onChange={(e) => setForm({...form, tax_rate: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="p-4 rounded-lg bg-primary/10 space-y-1">
                  <p className="text-sm text-muted-foreground">Subtotal: ${calculateSubtotal().toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Impuesto: ${(calculateSubtotal() * (parseFloat(form.tax_rate) || 0) / 100).toFixed(2)}</p>
                  <p className="font-bold">Total: ${(calculateSubtotal() * (1 + (parseFloat(form.tax_rate) || 0) / 100)).toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-invoice-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Factura
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Pagada">Pagada</SelectItem>
                <SelectItem value="Anulada">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Empresa</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                      <td className="font-mono text-sm">{inv.invoice_number}</td>
                      <td className="font-medium">{inv.client_name}</td>
                      <td>{inv.company_name}</td>
                      <td>${inv.total?.toFixed(2)}</td>
                      <td>{new Date(inv.created_at).toLocaleDateString('es')}</td>
                      <td>
                        <span className={getStatusBadge(inv.status)}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadPdf(inv.id)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {inv.status === 'Pendiente' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, 'Pagada')}>
                                <Check className="w-4 h-4 mr-2" />
                                Marcar Pagada
                              </DropdownMenuItem>
                            )}
                            {inv.status !== 'Anulada' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, 'Anulada')} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Anular
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay facturas</h3>
              <p className="text-muted-foreground text-sm">Crea tu primera factura</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
