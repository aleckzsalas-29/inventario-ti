import { useState, useEffect } from 'react';
import { quotationsAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, FileText, Download, Loader2, Search, MoreVertical, Check, X, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

// SAT Catalogs for Mexico
const USO_CFDI_OPTIONS = [
  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de cómputo' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios médicos' },
  { value: 'D02', label: 'D02 - Gastos médicos por incapacidad' },
  { value: 'D03', label: 'D03 - Gastos funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'P01', label: 'P01 - Por definir' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' }
];

const REGIMEN_FISCAL_OPTIONS = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Régimen de Enajenación' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '622', label: '622 - Actividades Agrícolas, Ganaderas, Silvícolas' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Régimen de las Actividades Empresariales (RESICO)' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' }
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Form state
  const [form, setForm] = useState({
    company_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    client_rfc: '',
    client_regimen_fiscal: '',
    tax_rate: '16',
    notes: '',
    terms_conditions: '',
    valid_days: '30',
    uso_cfdi: 'G03'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.client_name) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    if (itemsList.length === 0) {
      toast.error('Agregue al menos un concepto');
      return;
    }

    setSaving(true);
    try {
      await quotationsAPI.create({
        ...form,
        tax_rate: parseFloat(form.tax_rate) || 16,
        valid_days: parseInt(form.valid_days) || 30,
        items: itemsList
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

  const resetForm = () => {
    setForm({
      company_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      client_rfc: '',
      client_regimen_fiscal: '',
      tax_rate: '16',
      notes: '',
      terms_conditions: '',
      valid_days: '30',
      uso_cfdi: 'G03'
    });
    setItemsList([]);
  };

  const handleApprove = async (id) => {
    try {
      await quotationsAPI.approve(id);
      toast.success('Cotización aprobada');
      fetchData();
    } catch (error) {
      toast.error('Error al aprobar');
    }
  };

  const handleReject = async (id) => {
    try {
      await quotationsAPI.reject(id);
      toast.success('Cotización rechazada');
      fetchData();
    } catch (error) {
      toast.error('Error al rechazar');
    }
  };

  const downloadPdf = async (id) => {
    try {
      const response = await quotationsAPI.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cotizacion_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const filteredQuotations = quotations.filter(q => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      q.quotation_number?.toLowerCase().includes(search) ||
      q.client_name?.toLowerCase().includes(search) ||
      q.company_name?.toLowerCase().includes(search)
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
      'Aprobada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Rechazada': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Convertida': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
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
    <div className="space-y-6" data-testid="quotations-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="text-muted-foreground">Gestiona cotizaciones para tus clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-quotation-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cotización</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="client" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="client">Cliente</TabsTrigger>
                  <TabsTrigger value="items">Conceptos</TabsTrigger>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                </TabsList>

                {/* Client Tab */}
                <TabsContent value="client" className="space-y-4 mt-4">
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
                      <Label>Nombre del Cliente *</Label>
                      <Input
                        value={form.client_name}
                        onChange={(e) => setForm({...form, client_name: e.target.value})}
                        placeholder="Razón social o nombre"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>RFC del Cliente</Label>
                      <Input
                        value={form.client_rfc}
                        onChange={(e) => setForm({...form, client_rfc: e.target.value.toUpperCase()})}
                        placeholder="XAXX010101000"
                        maxLength={13}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Régimen Fiscal</Label>
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
                    <Label>Dirección</Label>
                    <Textarea
                      value={form.client_address}
                      onChange={(e) => setForm({...form, client_address: e.target.value})}
                      placeholder="Dirección completa del cliente"
                      rows={2}
                    />
                  </div>
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
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={itemForm.quantity}
                            onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
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
                        <div className="space-y-2">
                          <Label className="text-xs">Unidad</Label>
                          <Input
                            value={itemForm.unidad}
                            onChange={(e) => setItemForm({...itemForm, unidad: e.target.value})}
                            placeholder="Unidad"
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
                                  {item.quantity} x ${item.unit_price.toFixed(2)}
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
                            <span>${calculateSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>IVA ({form.tax_rate}%):</span>
                            <span>${(calculateSubtotal() * parseFloat(form.tax_rate || 16) / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>${(calculateSubtotal() * (1 + parseFloat(form.tax_rate || 16) / 100)).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Uso CFDI</Label>
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
                      <Label>IVA %</Label>
                      <Input
                        type="number"
                        value={form.tax_rate}
                        onChange={(e) => setForm({...form, tax_rate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vigencia (días)</Label>
                      <Input
                        type="number"
                        value={form.valid_days}
                        onChange={(e) => setForm({...form, valid_days: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({...form, notes: e.target.value})}
                      placeholder="Notas adicionales para el cliente"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Términos y Condiciones</Label>
                    <Textarea
                      value={form.terms_conditions}
                      onChange={(e) => setForm({...form, terms_conditions: e.target.value})}
                      placeholder="Términos y condiciones de la cotización"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Cotización
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
                  placeholder="Buscar por número, cliente..."
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
                <SelectItem value="Aprobada">Aprobada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
                <SelectItem value="Convertida">Convertida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredQuotations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Número</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">RFC</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Vigencia</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((q) => (
                    <tr key={q.id}>
                      <td className="font-medium">{q.quotation_number}</td>
                      <td>{q.client_name}</td>
                      <td className="font-mono text-sm">{q.client_rfc || '-'}</td>
                      <td className="font-medium">${q.total?.toFixed(2)}</td>
                      <td className="text-sm">{new Date(q.valid_until).toLocaleDateString('es')}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(q.status)}`}>
                          {q.status}
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
                            <DropdownMenuItem onClick={() => downloadPdf(q.id)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {q.status === 'Pendiente' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(q.id)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Aprobar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(q.id)}>
                                  <X className="w-4 h-4 mr-2" />
                                  Rechazar
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
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No hay cotizaciones</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterStatus ? 'No se encontraron cotizaciones con los filtros aplicados' : 'Comienza creando tu primera cotización'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
