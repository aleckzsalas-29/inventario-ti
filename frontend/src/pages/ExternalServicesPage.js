import { useState, useEffect } from 'react';
import { externalServicesAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Server, Globe, Shield, Cloud, HardDrive, Edit, Trash2, 
  MoreVertical, Loader2, Search, Calendar, DollarSign, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_TYPES = ['Hosting', 'Servidor Privado', 'Dominio', 'SSL', 'Cloud Storage', 'VPS', 'CDN', 'Backup', 'Otro'];
const PAYMENT_FREQUENCIES = ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Único'];

export default function ExternalServicesPage() {
  const [services, setServices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form
  const [form, setForm] = useState({
    company_id: '',
    service_type: '',
    provider: '',
    description: '',
    start_date: '',
    renewal_date: '',
    cost: '',
    payment_frequency: '',
    credentials_info: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterCompany]);

  const fetchData = async () => {
    try {
      const [svcRes, compRes] = await Promise.all([
        externalServicesAPI.getAll({ company_id: filterCompany || undefined }),
        companiesAPI.getAll()
      ]);
      setServices(svcRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.service_type || !form.provider || !form.start_date) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        cost: form.cost ? parseFloat(form.cost) : 0
      };
      
      if (editingService) {
        await externalServicesAPI.update(editingService.id, data);
        toast.success('Servicio actualizado');
      } else {
        await externalServicesAPI.create(data);
        toast.success('Servicio registrado');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (svc) => {
    setEditingService(svc);
    setForm({
      company_id: svc.company_id,
      service_type: svc.service_type,
      provider: svc.provider,
      description: svc.description || '',
      start_date: svc.start_date?.split('T')[0] || '',
      renewal_date: svc.renewal_date?.split('T')[0] || '',
      cost: svc.cost?.toString() || '',
      payment_frequency: svc.payment_frequency || '',
      credentials_info: svc.credentials_info || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar este servicio?')) return;
    try {
      await externalServicesAPI.delete(id);
      toast.success('Servicio desactivado');
      fetchData();
    } catch (error) {
      toast.error('Error al desactivar servicio');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setForm({
      company_id: '',
      service_type: '',
      provider: '',
      description: '',
      start_date: '',
      renewal_date: '',
      cost: '',
      payment_frequency: '',
      credentials_info: ''
    });
  };

  const getServiceIcon = (type) => {
    switch (type) {
      case 'Hosting': return <Globe className="w-5 h-5" />;
      case 'Servidor Privado': case 'VPS': return <Server className="w-5 h-5" />;
      case 'SSL': return <Shield className="w-5 h-5" />;
      case 'Cloud Storage': case 'CDN': return <Cloud className="w-5 h-5" />;
      case 'Backup': return <HardDrive className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const isRenewalSoon = (renewalDate) => {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const today = new Date();
    const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const filteredServices = services.filter(svc => {
    if (filterType && svc.service_type !== filterType) return false;
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      svc.provider?.toLowerCase().includes(search) ||
      svc.description?.toLowerCase().includes(search) ||
      svc.service_type?.toLowerCase().includes(search)
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
    <div className="space-y-6" data-testid="external-services-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Servicios Externos</h1>
          <p className="text-muted-foreground">Administra servicios contratados como hosting, servidores, dominios, etc.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-service-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={form.company_id} onValueChange={(value) => setForm({...form, company_id: value})}>
                    <SelectTrigger data-testid="service-company-select">
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
                  <Label>Tipo de Servicio *</Label>
                  <Select value={form.service_type} onValueChange={(value) => setForm({...form, service_type: value})}>
                    <SelectTrigger data-testid="service-type-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Input
                  value={form.provider}
                  onChange={(e) => setForm({...form, provider: e.target.value})}
                  placeholder="AWS, GoDaddy, DigitalOcean..."
                  data-testid="service-provider-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Detalles del servicio..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Inicio *</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({...form, start_date: e.target.value})}
                    data-testid="service-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Renovación</Label>
                  <Input
                    type="date"
                    value={form.renewal_date}
                    onChange={(e) => setForm({...form, renewal_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Costo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({...form, cost: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frecuencia de Pago</Label>
                  <Select value={form.payment_frequency} onValueChange={(value) => setForm({...form, payment_frequency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_FREQUENCIES.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Información de Credenciales</Label>
                <Textarea
                  value={form.credentials_info}
                  onChange={(e) => setForm({...form, credentials_info: e.target.value})}
                  placeholder="URL de acceso, usuario, notas de acceso (no guardar contraseñas en texto plano)..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-service-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingService ? 'Actualizar' : 'Registrar'}
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
                  placeholder="Buscar por proveedor, descripción..."
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {SERVICE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((svc) => (
            <Card key={svc.id} className="relative overflow-hidden" data-testid={`service-card-${svc.id}`}>
              {isRenewalSoon(svc.renewal_date) && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getServiceIcon(svc.service_type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{svc.provider}</CardTitle>
                      <p className="text-sm text-muted-foreground">{svc.service_type}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(svc)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(svc.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Desactivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {svc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{svc.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{svc.company_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>${svc.cost?.toFixed(2) || '0.00'}</span>
                    {svc.payment_frequency && (
                      <span className="text-muted-foreground">/ {svc.payment_frequency}</span>
                    )}
                  </div>
                </div>
                {svc.renewal_date && (
                  <div className={`flex items-center gap-2 text-sm ${isRenewalSoon(svc.renewal_date) ? 'text-amber-600' : ''}`}>
                    {isRenewalSoon(svc.renewal_date) && <AlertCircle className="w-4 h-4" />}
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Renovación: {new Date(svc.renewal_date).toLocaleDateString('es')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Server className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay servicios</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterCompany || filterType
                  ? 'No se encontraron servicios con los filtros aplicados'
                  : 'Comienza registrando tus servicios externos'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Building2(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
