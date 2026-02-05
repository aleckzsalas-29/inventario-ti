import { useState, useEffect } from 'react';
import { quotationsAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, FileText, Download, Loader2, Search, MoreVertical, Check, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [itemDesc, setItemDesc] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDiscount, setItemDiscount] = useState('0');
  const [itemsList, setItemsList] = useState([]);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [quotRes, compRes] = await Promise.all([
        quotationsAPI.getAll({ status: filterStatus || undefined }),
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

  const addItemToList = () => {
    if (!itemDesc || !itemPrice) {
      toast.error('Complete descripción y precio');
      return;
    }
    setItemsList([...itemsList, {
      description: itemDesc,
      quantity: parseInt(itemQty) || 1,
      unit_price: parseFloat(itemPrice) || 0,
      discount: parseFloat(itemDiscount) || 0
    }]);
    setItemDesc('');
    setItemQty('1');
    setItemPrice('');
    setItemDiscount('0');
  };

  const removeItemFromList = (index) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !clientName) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    if (itemsList.length === 0) {
      toast.error('Agregue al menos un item');
      return;
    }
    setSaving(true);
    try {
      await quotationsAPI.create({
        company_id: companyId,
        client_name: clientName,
        client_email: clientEmail || null,
        client_address: clientAddress || null,
        items: itemsList,
        tax_rate: parseFloat(taxRate) || 0,
        notes: notes || null,
        valid_days: parseInt(validDays) || 30
      });
      toast.success('Cotización creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear');
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
      toast.error('Error');
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
    } catch (error) {
      toast.error('Error');
    }
  };

  const resetForm = () => {
    setCompanyId('');
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setTaxRate('0');
    setNotes('');
    setValidDays('30');
    setItemDesc('');
    setItemQty('1');
    setItemPrice('');
    setItemDiscount('0');
    setItemsList([]);
  };

  const subtotal = itemsList.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 - item.discount / 100)), 0);
  const taxAmount = subtotal * (parseFloat(taxRate) || 0) / 100;
  const total = subtotal + taxAmount;

  const filteredQuotations = quotations.filter(q => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return q.quotation_number?.toLowerCase().includes(s) || q.client_name?.toLowerCase().includes(s);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="quotations-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="text-muted-foreground">Crea y gestiona cotizaciones</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-quotation-btn"><Plus className="w-4 h-4 mr-2" />Nueva Cotización</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Cotización</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Días Validez</Label>
                  <Input type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre cliente" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label>Agregar Item</Label>
                <div className="grid grid-cols-12 gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="col-span-4">
                    <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Descripción" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(e.target.value)} placeholder="Cant" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="Precio" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="0" max="100" value={itemDiscount} onChange={(e) => setItemDiscount(e.target.value)} placeholder="Desc%" />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addItemToList} variant="secondary" className="w-full">Agregar</Button>
                  </div>
                </div>

                {itemsList.length > 0 && (
                  <div className="space-y-2">
                    {itemsList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <span className="text-sm">{item.description} x{item.quantity} @ ${item.unit_price}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItemFromList(idx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Impuesto %</Label>
                  <Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm">Subtotal: ${subtotal.toFixed(2)}</p>
                  <p className="text-sm">Impuesto: ${taxAmount.toFixed(2)}</p>
                  <p className="font-bold">Total: ${total.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crear
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
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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
                      <td>
                        <span className={`status-badge ${quot.status === 'Pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : quot.status === 'Aceptada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {quot.status}
                        </span>
                      </td>
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
                              <DropdownMenuItem onClick={() => handleUpdateStatus(quot.id, 'Aceptada')}>
                                <Check className="w-4 h-4 mr-2" />Aceptar
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
              <div className="empty-state-icon"><FileText className="w-8 h-8 text-muted-foreground" /></div>
              <h3 className="font-semibold mb-1">No hay cotizaciones</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
