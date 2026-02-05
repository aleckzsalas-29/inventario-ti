import { useState, useEffect } from 'react';
import { invoicesAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, Receipt, Download, Loader2, Search, MoreVertical, Check, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

function InvoiceItemRow({ item, index, onUpdate, onRemove, canRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50">
      <div className="col-span-5 space-y-1">
        <Label className="text-xs">Descripción</Label>
        <Input value={item.description} onChange={(e) => onUpdate(index, 'description', e.target.value)} placeholder="Servicio" />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Cant.</Label>
        <Input type="number" min="1" value={item.quantity} onChange={(e) => onUpdate(index, 'quantity', e.target.value)} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Precio</Label>
        <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => onUpdate(index, 'unit_price', e.target.value)} />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Desc.%</Label>
        <Input type="number" min="0" max="100" value={item.discount} onChange={(e) => onUpdate(index, 'discount', e.target.value)} />
      </div>
      <div className="col-span-1">
        {canRemove && <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    company_id: '', client_name: '', client_email: '', client_address: '', client_tax_id: '',
    items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }], tax_rate: 0, notes: ''
  });

  useEffect(() => { fetchData(); }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [invRes, compRes] = await Promise.all([
        invoicesAPI.getAll({ status: filterStatus || undefined }),
        companiesAPI.getAll()
      ]);
      setInvoices(invRes.data);
      setCompanies(compRes.data);
    } catch (error) { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.client_name) { toast.error('Complete campos obligatorios'); return; }
    const validItems = form.items.filter(i => i.description && i.unit_price);
    if (!validItems.length) { toast.error('Agregue items'); return; }
    setSaving(true);
    try {
      await invoicesAPI.create({
        ...form,
        items: validItems.map(i => ({ ...i, quantity: parseInt(i.quantity) || 1, unit_price: parseFloat(i.unit_price) || 0, discount: parseFloat(i.discount) || 0 })),
        tax_rate: parseFloat(form.tax_rate) || 0
      });
      toast.success('Factura creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try { await invoicesAPI.updateStatus(id, status); toast.success('Actualizado'); fetchData(); }
    catch { toast.error('Error'); }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await invoicesAPI.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'factura.pdf');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('Error descarga'); }
  };

  const resetForm = () => setForm({ company_id: '', client_name: '', client_email: '', client_address: '', client_tax_id: '', items: [{ description: '', quantity: 1, unit_price: '', discount: 0 }], tax_rate: 0, notes: '' });
  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: '', discount: 0 }] });
  const removeItem = (idx) => form.items.length > 1 && setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => { const items = [...form.items]; items[idx][field] = val; setForm({ ...form, items }); };
  const calcSubtotal = () => form.items.reduce((s, i) => s + ((parseInt(i.quantity) || 0) * (parseFloat(i.unit_price) || 0) * (1 - (parseFloat(i.discount) || 0) / 100)), 0);

  const getStatusBadge = (s) => ({ 'Pendiente': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', 'Pagada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', 'Anulada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }[s] || '');
  const filtered = invoices.filter(i => !searchQuery || i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || i.client_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const subtotal = calcSubtotal(), tax = subtotal * (parseFloat(form.tax_rate) || 0) / 100, total = subtotal + tax;

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="page-header">
        <div><h1 className="page-title">Facturas</h1><p className="text-muted-foreground">Gestiona facturas</p></div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); !o && resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nueva Factura</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Factura</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Empresa *</Label>
                  <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>RUC Cliente</Label><Input value={form.client_tax_id} onChange={(e) => setForm({ ...form, client_tax_id: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cliente *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Dirección</Label><Input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} /></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Items *</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1" />Agregar</Button></div>
                {form.items.map((item, idx) => <InvoiceItemRow key={idx} item={item} index={idx} onUpdate={updateItem} onRemove={removeItem} canRemove={form.items.length > 1} />)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Impuesto %</Label><Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
                <div className="p-4 rounded-lg bg-primary/10 space-y-1">
                  <p className="text-sm text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Impuesto: ${tax.toFixed(2)}</p>
                  <p className="font-bold">Total: ${total.toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crear</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="">Todos</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="Pagada">Pagada</SelectItem><SelectItem value="Anulada">Anulada</SelectItem></SelectContent></Select>
      </div></CardContent></Card>
      <Card><CardContent className="pt-6">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto"><table className="data-table"><thead><tr className="border-b"><th className="pb-3">Número</th><th className="pb-3">Cliente</th><th className="pb-3">Total</th><th className="pb-3">Fecha</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Acciones</th></tr></thead>
            <tbody>{filtered.map((inv) => (
              <tr key={inv.id}><td className="font-mono text-sm">{inv.invoice_number}</td><td className="font-medium">{inv.client_name}</td><td>${inv.total?.toFixed(2)}</td><td>{new Date(inv.created_at).toLocaleDateString('es')}</td>
                <td><span className={`status-badge ${getStatusBadge(inv.status)}`}>{inv.status}</span></td>
                <td className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownloadPdf(inv.id)}><Download className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                  {inv.status === 'Pendiente' && <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, 'Pagada')}><Check className="w-4 h-4 mr-2" />Pagada</DropdownMenuItem>}
                  {inv.status !== 'Anulada' && <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, 'Anulada')} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Anular</DropdownMenuItem>}
                </DropdownMenuContent></DropdownMenu></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : (<div className="empty-state"><div className="empty-state-icon"><Receipt className="w-8 h-8 text-muted-foreground" /></div><h3 className="font-semibold mb-1">No hay facturas</h3></div>)}
      </CardContent></Card>
    </div>
  );
}
