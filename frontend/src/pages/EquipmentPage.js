import { useState, useEffect } from 'react';
import { equipmentAPI, companiesAPI, branchesAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Search, Filter, Download, Monitor, Eye, Edit, Trash2, 
  MoreVertical, FileText, Wrench, AlertTriangle, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

const EQUIPMENT_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Impresora', 'Servidor', 'Switch', 'Router', 'Teléfono', 'Tablet', 'Otro'];
const ACQUISITION_TYPES = ['Propio', 'Arrendado', 'Prestamo'];
const STATUS_OPTIONS = ['Disponible', 'Asignado', 'En Reparacion', 'De Baja'];

export default function EquipmentPage() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form state
  const [form, setForm] = useState({
    company_id: '',
    branch_id: '',
    inventory_code: '',
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    acquisition_type: 'Propio',
    acquisition_date: '',
    provider: '',
    status: 'Disponible',
    observations: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterCompany, filterStatus, filterType]);

  const fetchData = async () => {
    try {
      const [eqRes, compRes] = await Promise.all([
        equipmentAPI.getAll({ 
          company_id: filterCompany || undefined,
          status: filterStatus || undefined,
          equipment_type: filterType || undefined
        }),
        companiesAPI.getAll()
      ]);
      setEquipment(eqRes.data);
      setCompanies(compRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (companyId) => {
    if (!companyId) {
      setBranches([]);
      return;
    }
    try {
      const response = await branchesAPI.getAll(companyId);
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id || !form.inventory_code || !form.equipment_type || !form.brand || !form.model || !form.serial_number) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (editingEquipment) {
        await equipmentAPI.update(editingEquipment.id, form);
        toast.success('Equipo actualizado');
      } else {
        await equipmentAPI.create(form);
        toast.success('Equipo registrado');
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

  const handleEdit = (eq) => {
    setEditingEquipment(eq);
    setForm({
      company_id: eq.company_id,
      branch_id: eq.branch_id || '',
      inventory_code: eq.inventory_code,
      equipment_type: eq.equipment_type,
      brand: eq.brand,
      model: eq.model,
      serial_number: eq.serial_number,
      acquisition_type: eq.acquisition_type,
      acquisition_date: eq.acquisition_date || '',
      provider: eq.provider || '',
      status: eq.status,
      observations: eq.observations || ''
    });
    fetchBranches(eq.company_id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este equipo?')) return;
    try {
      await equipmentAPI.delete(id);
      toast.success('Equipo eliminado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingEquipment(null);
    setForm({
      company_id: '',
      branch_id: '',
      inventory_code: '',
      equipment_type: '',
      brand: '',
      model: '',
      serial_number: '',
      acquisition_type: 'Propio',
      acquisition_date: '',
      provider: '',
      status: 'Disponible',
      observations: ''
    });
    setBranches([]);
  };

  const downloadReport = async () => {
    try {
      const response = await reportsAPI.equipmentPdf({ 
        company_id: filterCompany || undefined,
        status: filterStatus || undefined
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_equipos.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Reporte descargado');
    } catch (error) {
      toast.error('Error al descargar reporte');
    }
  };

  const filteredEquipment = equipment.filter(eq => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      eq.inventory_code?.toLowerCase().includes(search) ||
      eq.serial_number?.toLowerCase().includes(search) ||
      eq.brand?.toLowerCase().includes(search) ||
      eq.model?.toLowerCase().includes(search) ||
      eq.company_name?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status) => {
    const classes = {
      'Disponible': 'status-disponible',
      'Asignado': 'status-asignado',
      'En Reparacion': 'status-reparacion',
      'De Baja': 'status-baja'
    };
    return `status-badge ${classes[status] || ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="equipment-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Equipos</h1>
          <p className="text-muted-foreground">Administra el inventario de equipos tecnológicos</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadReport} data-testid="download-report-btn">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-equipment-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEquipment ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Select 
                      value={form.company_id} 
                      onValueChange={(value) => { 
                        setForm({...form, company_id: value, branch_id: ''}); 
                        fetchBranches(value);
                      }}
                    >
                      <SelectTrigger data-testid="company-select">
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
                    <Label>Sucursal</Label>
                    <Select value={form.branch_id} onValueChange={(value) => setForm({...form, branch_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código de Inventario *</Label>
                    <Input
                      value={form.inventory_code}
                      onChange={(e) => setForm({...form, inventory_code: e.target.value})}
                      placeholder="EQ-001"
                      data-testid="inventory-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Equipo *</Label>
                    <Select value={form.equipment_type} onValueChange={(value) => setForm({...form, equipment_type: value})}>
                      <SelectTrigger data-testid="equipment-type-select">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm({...form, brand: e.target.value})}
                      placeholder="Dell, HP, Lenovo..."
                      data-testid="brand-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo *</Label>
                    <Input
                      value={form.model}
                      onChange={(e) => setForm({...form, model: e.target.value})}
                      placeholder="Latitude 5520"
                      data-testid="model-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Serie *</Label>
                    <Input
                      value={form.serial_number}
                      onChange={(e) => setForm({...form, serial_number: e.target.value})}
                      placeholder="SN123456789"
                      data-testid="serial-number-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Adquisición</Label>
                    <Select value={form.acquisition_type} onValueChange={(value) => setForm({...form, acquisition_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACQUISITION_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Adquisición</Label>
                    <Input
                      type="date"
                      value={form.acquisition_date}
                      onChange={(e) => setForm({...form, acquisition_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input
                      value={form.provider}
                      onChange={(e) => setForm({...form, provider: e.target.value})}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                </div>

                {editingEquipment && (
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({...form, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={form.observations}
                    onChange={(e) => setForm({...form, observations: e.target.value})}
                    placeholder="Notas adicionales sobre el equipo..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="save-equipment-btn">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingEquipment ? 'Actualizar' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, serie, marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            <Select value={filterCompany || "all"} onValueChange={(v) => setFilterCompany(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]" data-testid="filter-company">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]" data-testid="filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {EQUIPMENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]" data-testid="filter-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterCompany || filterStatus || filterType) && (
              <Button variant="ghost" size="icon" onClick={() => { setFilterCompany(''); setFilterStatus(''); setFilterType(''); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredEquipment.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Código</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Marca / Modelo</th>
                    <th className="pb-3">Serie</th>
                    <th className="pb-3">Empresa</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((eq) => (
                    <tr key={eq.id} data-testid={`equipment-row-${eq.id}`}>
                      <td className="font-medium">{eq.inventory_code}</td>
                      <td>{eq.equipment_type}</td>
                      <td>{eq.brand} / {eq.model}</td>
                      <td className="font-mono text-sm">{eq.serial_number}</td>
                      <td>{eq.company_name}</td>
                      <td>
                        <span className={getStatusBadge(eq.status)}>
                          {eq.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`equipment-menu-${eq.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/equipment/${eq.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(eq)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {eq.status !== 'De Baja' && eq.status !== 'Asignado' && (
                              <DropdownMenuItem onClick={() => handleDelete(eq.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
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
                <Monitor className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay equipos</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterCompany || filterStatus || filterType
                  ? 'No se encontraron equipos con los filtros aplicados'
                  : 'Comienza registrando tu primer equipo'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
