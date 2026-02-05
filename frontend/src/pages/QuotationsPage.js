import { useState, useEffect } from 'react';
import { quotationsAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, FileText, Download, Loader2, Search, MoreVertical, Check, X as XIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

function QuotationItemRow({ item, index, onUpdate, onRemove, canRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
      <div className="col-span-5 space-y-1">
        <Label className="text-xs">Descripción</Label>
        <Input
          value={item.description}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          placeholder="Servicio o producto"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Cantidad</Label>
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Precio Unit.</Label>
        <Input
          type="number"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onUpdate(index, 'unit_price', e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Desc. %</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={item.discount}
          onChange={(e) => onUpdate(index, 'discount', e.target.value)}
        />
      </div>
      <div className="col-span-1">
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
            <XIcon className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [form, setForm] = useState({
    company_id: '',
    client_name: '',
    client_email: '',
    client_address: '',
    items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }],
    tax_rate: 0,
    notes: '',
    valid_days: 30
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCompany]);

  const fetchData = async () => {
    try {
      const [quotRes, compRes] = await Promise.all([
        quotationsAPI.getAll({ status: filterStatus || undefined, company_id: filterCompany || undefined }),
        companiesAPI.getAll()
      ]);
      setQuotations(quotRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.client_name) {
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
      await quotationsAPI.create({
        ...form,
        items: validItems.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          discount: parseFloat(item.discount) || 0
        })),
        tax_rate: parseFloat(form.tax_rate) || 0,
        valid_days: parseInt(form.valid_days) || 30
      });
      toast.success('Cotización creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cotización');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await quotationsAPI.updateStatus(id, status);
      toast.success('Estado actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await quotationsAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cotizacion.pdf');
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
      client_name: '',
      client_email: '',
      client_address: '',
      items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }],
      tax_rate: 0,
      notes: '',
      valid_days: 30
    });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: '', discount: 0 }] });
  };

  const removeItem = (index) => {
    if (form.items.length > 1) {
      setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
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
      const disc = parseFloat(item.discount) || 0;
      return sum + (qty * price * (1 - disc / 100));
    }, 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pendiente': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'Aceptada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Rechazada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Convertida': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return styles[status] || '';
  };

  const filteredQuotations = quotations.filter(q => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return q.quotation_number?.toLowerCase().includes(search) || q.client_name?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const taxAmount = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-6" data-testid="quotations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="text-muted-foreground">Crea y gestiona cotizaciones para clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-quotation-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Cotización</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa Emisora *</Label>
                  <Select value={form.company_id} onValueChange={(value) => setForm({...form, company_id: value})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Días de Validez</Label>
                  <Input type="number" value={form.valid_days} onChange={(e) => setForm({...form, valid_days: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Cliente *</Label>
                  <Input value={form.client_name} onChange={(e) => setForm({...form, client_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email del Cliente</Label>
                  <Input type="email" value={form.client_email} onChange={(e) => setForm({...form, client_email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.client_address} onChange={(e) => setForm({...form, client_address: e.target.value})} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" />Agregar
                  </Button>
                </div>
                {form.items.map((item, index) => (
                  <QuotationItemRow 
                    key={index} 
                    item={item} 
                    index={index} 
                    onUpdate={updateItem} 
                    onRemove={removeItem}
                    canRemove={form.items.length > 1}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Impuesto (%)</Label>
                  <Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({...form, tax_rate: e.target.value})} />
                </div>
                <div className="p-4 rounded-lg bg-primary/10 space-y-1">
                  <p className="text-sm text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Impuesto: ${taxAmount.toFixed(2)}</p>
                  <p className="font-bold">Total: ${total.toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Aceptada">Aceptada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {filteredQuotations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Válido Hasta</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((quot) => (
                    <tr key={quot.id}>
                      <td className="font-mono text-sm">{quot.quotation_number}</td>
                      <td className="font-medium">{quot.client_name}</td>
                      <td>${quot.total?.toFixed(2)}</td>
                      <td>{new Date(quot.valid_until).toLocaleDateString('es')}</td>
                      <td><span className={`status-badge ${getStatusBadge(quot.status)}`}>{quot.status}</span></td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadPdf(quot.id)}>
                              <Download className="w-4 h-4 mr-2" />PDF
                            </DropdownMenuItem>
                            {quot.status === 'Pendiente' && (
                              <>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quot.id, 'Aceptada')}>
                                  <Check className="w-4 h-4 mr-2" />Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(quot.id, 'Rechazada')}>
                                  <XIcon className="w-4 h-4 mr-2" />Rechazar
                                </DropdownMenuItem>
                              </>
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
              <div className="empty-state-icon"><FileText className="w-8 h-8 text-muted-foreground" /></div>
              <h3 className="font-semibold mb-1">No hay cotizaciones</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
