import { useState, useEffect } from 'react';
import { invoicesAPI, companiesAPI, quotationsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Receipt, Download, Loader2, Search, MoreVertical, Check, Trash2, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

// SAT Catalogs for Mexico CFDI
const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo' },
  { value: 'P01', label: 'P01 - Por definir' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' }
];

const METODO_PAGO_OPTIONS = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' }
];

const FORMA_PAGO_OPTIONS = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica de fondos' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '05', label: '05 - Monedero electrónico' },
  { value: '06', label: '06 - Dinero electrónico' },
  { value: '08', label: '08 - Vales de despensa' },
  { value: '12', label: '12 - Dación en pago' },
  { value: '13', label: '13 - Pago por subrogación' },
  { value: '14', label: '14 - Pago por consignación' },
  { value: '15', label: '15 - Condonación' },
  { value: '17', label: '17 - Compensación' },
  { value: '23', label: '23 - Novación' },
  { value: '24', label: '24 - Confusión' },
  { value: '25', label: '25 - Remisión de deuda' },
  { value: '26', label: '26 - Prescripción o caducidad' },
  { value: '27', label: '27 - A satisfacción del acreedor' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '29', label: '29 - Tarjeta de servicios' },
  { value: '30', label: '30 - Aplicación de anticipos' },
  { value: '31', label: '31 - Intermediario pagos' },
  { value: '99', label: '99 - Por definir' }
];

const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '625', label: '625 - RESICO' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' }
];

const MONEDA_OPTIONS = [
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' }
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form state
  const [form, setForm] = useState({
    company_id: '',
    quotation_id: '',
    serie: 'A',
    // Client info
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_rfc: '',
    client_regimen_fiscal: '',
    client_codigo_postal: '',
    // CFDI fields
    uso_cfdi: 'G03',
    metodo_pago: 'PUE',
    forma_pago: '03',
    condiciones_pago: '',
    moneda: 'MXN',
    tipo_cambio: '',
    // Totals
    tax_rate: '16',
    notes: ''
  });
  
  // Items
  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: '1',
    unit_price: '',
    discount: '0',
    clave_prod_serv: '',
    clave_unidad: 'E48',
    unidad: 'Unidad de servicio'
  });
  const [itemsList, setItemsList] = useState([]);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [invRes, compRes, quotRes] = await Promise.all([
        invoicesAPI.getAll({ status: filterStatus || undefined }),
        companiesAPI.getAll(),
        quotationsAPI.getAll({ status: 'Aprobada' })
      ]);
      setInvoices(invRes.data);
      setCompanies(compRes.data);
      setQuotations(quotRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const addItemToList = () => {
    if (!itemForm.description || !itemForm.unit_price) {
      toast.error('Complete descripción y precio');
      return;
    }
    setItemsList([...itemsList, {
      description: itemForm.description,
      quantity: parseFloat(itemForm.quantity) || 1,
      unit_price: parseFloat(itemForm.unit_price) || 0,
      discount: parseFloat(itemForm.discount) || 0,
      clave_prod_serv: itemForm.clave_prod_serv,
      clave_unidad: itemForm.clave_unidad,
      unidad: itemForm.unidad
    }]);
    setItemForm({
      description: '',
      quantity: '1',
      unit_price: '',
      discount: '0',
      clave_prod_serv: '',
      clave_unidad: 'E48',
      unidad: 'Unidad de servicio'
    });
  };

  const removeItemFromList = (index) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const loadFromQuotation = async (quotationId) => {
    const quot = quotations.find(q => q.id === quotationId);
    if (quot) {
      setForm({
        ...form,
        quotation_id: quotationId,
        company_id: quot.company_id,
        client_name: quot.client_name,
        client_email: quot.client_email || '',
        client_phone: quot.client_phone || '',
        client_address: quot.client_address || '',
        client_rfc: quot.client_rfc || '',
        client_regimen_fiscal: quot.client_regimen_fiscal || '',
        tax_rate: String(quot.tax_rate || 16),
        uso_cfdi: quot.uso_cfdi || 'G03'
      });
      setItemsList(quot.items || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.client_name || !form.client_rfc) {
      toast.error('Complete los campos obligatorios (Empresa, Cliente, RFC)');
      return;
    }
    if (itemsList.length === 0) {
      toast.error('Agregue al menos un concepto');
      return;
    }

    setSaving(true);
    try {
      await invoicesAPI.create({
        ...form,
        tax_rate: parseFloat(form.tax_rate) || 16,
        tipo_cambio: form.tipo_cambio ? parseFloat(form.tipo_cambio) : undefined,
        items: itemsList
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

  const resetForm = () => {
    setForm({
      company_id: '',
      quotation_id: '',
      serie: 'A',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      client_rfc: '',
      client_regimen_fiscal: '',
      client_codigo_postal: '',
      uso_cfdi: 'G03',
      metodo_pago: 'PUE',
      forma_pago: '03',
      condiciones_pago: '',
      moneda: 'MXN',
      tipo_cambio: '',
      tax_rate: '16',
      notes: ''
    });
    setItemsList([]);
  };

  const handleMarkPaid = async (id) => {
    try {
      await invoicesAPI.markPaid(id);
      toast.success('Factura marcada como pagada');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const downloadPdf = async (id) => {
    try {
      const response = await invoicesAPI.getPdf(id);
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

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(search) ||
      inv.client_name?.toLowerCase().includes(search) ||
      inv.client_rfc?.toLowerCase().includes(search)
    );
  });

  const calculateSubtotal = () => {
    return itemsList.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * (1 - item.discount / 100));
    }, 0);
  };

  const getStatusBadge = (status) => {
    const classes = {
      'Pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Pagada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Cancelada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Timbrada': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return classes[status] || classes['Pendiente'];
  };

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
          <h1 className="page-title">Facturación</h1>
          <p className="text-muted-foreground">Gestiona facturas con formato CFDI México</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-invoice-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Factura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Factura (CFDI)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="client" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="client">Receptor</TabsTrigger>
                  <TabsTrigger value="cfdi">CFDI</TabsTrigger>
                  <TabsTrigger value="items">Conceptos</TabsTrigger>
                  <TabsTrigger value="notes">Notas</TabsTrigger>
                </TabsList>

                {/* Client/Receptor Tab */}
                <TabsContent value="client" className="space-y-4 mt-4">
                  {/* Load from quotation */}
                  {quotations.length > 0 && (
                    <Card className="border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <Label>Cargar desde cotización aprobada</Label>
                            <Select onValueChange={loadFromQuotation}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cotización" />
                              </SelectTrigger>
                              <SelectContent>
                                {quotations.map(q => (
                                  <SelectItem key={q.id} value={q.id}>
                                    {q.quotation_number} - {q.client_name} (${q.total?.toFixed(2)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Empresa Emisora *</Label>
                      <Select value={form.company_id} onValueChange={(v) => setForm({...form, company_id: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Serie</Label>
                      <Input
                        value={form.serie}
                        onChange={(e) => setForm({...form, serie: e.target.value.toUpperCase()})}
                        placeholder="A"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre/Razón Social del Receptor *</Label>
                      <Input
                        value={form.client_name}
                        onChange={(e) => setForm({...form, client_name: e.target.value})}
                        placeholder="Nombre o razón social"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RFC del Receptor *</Label>
                      <Input
                        value={form.client_rfc}
                        onChange={(e) => setForm({...form, client_rfc: e.target.value.toUpperCase()})}
                        placeholder="XAXX010101000"
                        maxLength={13}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Régimen Fiscal del Receptor</Label>
                      <Select value={form.client_regimen_fiscal} onValueChange={(v) => setForm({...form, client_regimen_fiscal: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar régimen" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIMEN_FISCAL_OPTIONS.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Código Postal del Receptor</Label>
                      <Input
                        value={form.client_codigo_postal}
                        onChange={(e) => setForm({...form, client_codigo_postal: e.target.value})}
                        placeholder="06600"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.client_email}
                        onChange={(e) => setForm({...form, client_email: e.target.value})}
                        placeholder="cliente@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={form.client_phone}
                        onChange={(e) => setForm({...form, client_phone: e.target.value})}
                        placeholder="+52 55 1234 5678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección Fiscal</Label>
                    <Textarea
                      value={form.client_address}
                      onChange={(e) => setForm({...form, client_address: e.target.value})}
                      placeholder="Dirección completa del receptor"
                      rows={2}
                    />
                  </div>
                </TabsContent>

                {/* CFDI Tab */}
                <TabsContent value="cfdi" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Datos CFDI</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Uso CFDI *</Label>
                          <Select value={form.uso_cfdi} onValueChange={(v) => setForm({...form, uso_cfdi: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USO_CFDI_OPTIONS.map(u => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Método de Pago *</Label>
                          <Select value={form.metodo_pago} onValueChange={(v) => setForm({...form, metodo_pago: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {METODO_PAGO_OPTIONS.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Forma de Pago *</Label>
                          <Select value={form.forma_pago} onValueChange={(v) => setForm({...form, forma_pago: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FORMA_PAGO_OPTIONS.map(f => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Condiciones de Pago</Label>
                          <Input
                            value={form.condiciones_pago}
                            onChange={(e) => setForm({...form, condiciones_pago: e.target.value})}
                            placeholder="Ej: Contado, 30 días, etc."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Moneda</Label>
                          <Select value={form.moneda} onValueChange={(v) => setForm({...form, moneda: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONEDA_OPTIONS.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {form.moneda !== 'MXN' && (
                          <div className="space-y-2">
                            <Label>Tipo de Cambio</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={form.tipo_cambio}
                              onChange={(e) => setForm({...form, tipo_cambio: e.target.value})}
                              placeholder="18.5000"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>IVA %</Label>
                          <Input
                            type="number"
                            value={form.tax_rate}
                            onChange={(e) => setForm({...form, tax_rate: e.target.value})}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Agregar Concepto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Descripción *</Label>
                          <Input
                            value={itemForm.description}
                            onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                            placeholder="Descripción del producto o servicio"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Clave Prod/Serv SAT</Label>
                          <Input
                            value={itemForm.clave_prod_serv}
                            onChange={(e) => setItemForm({...itemForm, clave_prod_serv: e.target.value})}
                            placeholder="Ej: 81112101"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            value={itemForm.quantity}
                            onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Clave Unidad</Label>
                          <Input
                            value={itemForm.clave_unidad}
                            onChange={(e) => setItemForm({...itemForm, clave_unidad: e.target.value})}
                            placeholder="E48"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Unidad</Label>
                          <Input
                            value={itemForm.unidad}
                            onChange={(e) => setItemForm({...itemForm, unidad: e.target.value})}
                            placeholder="Pieza"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Precio Unitario *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={itemForm.unit_price}
                            onChange={(e) => setItemForm({...itemForm, unit_price: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Descuento %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={itemForm.discount}
                            onChange={(e) => setItemForm({...itemForm, discount: e.target.value})}
                          />
                        </div>
                      </div>
                      <Button type="button" onClick={addItemToList} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Concepto
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Items List */}
                  {itemsList.length > 0 && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {itemsList.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} {item.unidad} x ${item.unit_price.toFixed(2)}
                                  {item.discount > 0 && ` (-${item.discount}%)`}
                                  {item.clave_prod_serv && ` | SAT: ${item.clave_prod_serv}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-medium">
                                  ${(item.quantity * item.unit_price * (1 - item.discount / 100)).toFixed(2)}
                                </span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItemFromList(idx)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t mt-4 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${calculateSubtotal().toFixed(2)} {form.moneda}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>IVA ({form.tax_rate}%):</span>
                            <span>${(calculateSubtotal() * parseFloat(form.tax_rate || 16) / 100).toFixed(2)} {form.moneda}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>${(calculateSubtotal() * (1 + parseFloat(form.tax_rate || 16) / 100)).toFixed(2)} {form.moneda}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Notas / Observaciones</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({...form, notes: e.target.value})}
                      placeholder="Notas adicionales para la factura"
                      rows={4}
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-400 mb-2">Nota sobre timbrado CFDI</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Para timbrar la factura ante el SAT, se requiere integración con un PAC (Proveedor Autorizado de Certificación).
                      Actualmente esta funcionalidad está pendiente de configuración.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
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
                  placeholder="Buscar por número, cliente, RFC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Pagada">Pagada</SelectItem>
                <SelectItem value="Timbrada">Timbrada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
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
                    <th className="pb-3">Folio</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">RFC</th>
                    <th className="pb-3">Uso CFDI</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-medium">{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td className="font-mono text-sm">{inv.client_rfc || '-'}</td>
                      <td className="text-sm">{inv.uso_cfdi || '-'}</td>
                      <td className="font-medium">${inv.total?.toFixed(2)} {inv.moneda || 'MXN'}</td>
                      <td className="text-sm">{new Date(inv.created_at).toLocaleDateString('es')}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(inv.status)}`}>
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
                            <DropdownMenuItem onClick={() => downloadPdf(inv.id)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {inv.status === 'Pendiente' && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}>
                                <Check className="w-4 h-4 mr-2" />
                                Marcar Pagada
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
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No hay facturas</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterStatus ? 'No se encontraron facturas con los filtros aplicados' : 'Comienza creando tu primera factura'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
