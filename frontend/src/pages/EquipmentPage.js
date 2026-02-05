import { useState, useEffect } from 'react';
import { equipmentAPI, companiesAPI, branchesAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Search, Download, Monitor, Eye, Edit, Trash2, 
  MoreVertical, Loader2, X, KeyRound, Mail, Cloud, EyeOff,
  Cpu, HardDrive, Wifi, Shield, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

const EQUIPMENT_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Impresora', 'Servidor', 'Switch', 'Router', 'Teléfono', 'Tablet', 'Otro'];
const STATUS_OPTIONS = ['Disponible', 'Asignado', 'En Mantenimiento', 'De Baja'];
const RAM_TYPES = ['DDR3', 'DDR4', 'DDR5', 'LPDDR4', 'LPDDR5'];
const STORAGE_TYPES = ['SSD', 'HDD', 'NVMe', 'eMMC', 'Híbrido'];

const initialFormState = {
  company_id: '',
  branch_id: '',
  inventory_code: '',
  equipment_type: '',
  brand: '',
  model: '',
  serial_number: '',
  status: 'Disponible',
  observations: '',
  // Hardware specs
  processor_brand: '',
  processor_model: '',
  processor_speed: '',
  ram_capacity: '',
  ram_type: '',
  storage_type: '',
  storage_capacity: '',
  // Software
  os_name: '',
  os_version: '',
  os_license: '',
  antivirus_name: '',
  antivirus_license: '',
  antivirus_expiry: '',
  // Network
  ip_address: '',
  mac_address: '',
  // Credentials
  windows_user: '',
  windows_password: '',
  email_account: '',
  email_password: '',
  cloud_user: '',
  cloud_password: ''
};

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
  const [form, setForm] = useState(initialFormState);
  
  // Custom fields
  const [customFieldValues, setCustomFieldValues] = useState({});
  
  // Password visibility toggles
  const [showPasswords, setShowPasswords] = useState({
    windows: false,
    email: false,
    cloud: false
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
      const payload = { ...form, custom_fields: customFieldValues };
      if (editingEquipment) {
        await equipmentAPI.update(editingEquipment.id, payload);
        toast.success('Equipo actualizado');
      } else {
        await equipmentAPI.create(payload);
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
      company_id: eq.company_id || '',
      branch_id: eq.branch_id || '',
      inventory_code: eq.inventory_code || '',
      equipment_type: eq.equipment_type || '',
      brand: eq.brand || '',
      model: eq.model || '',
      serial_number: eq.serial_number || '',
      status: eq.status || 'Disponible',
      observations: eq.observations || '',
      // Hardware
      processor_brand: eq.processor_brand || '',
      processor_model: eq.processor_model || '',
      processor_speed: eq.processor_speed || '',
      ram_capacity: eq.ram_capacity || '',
      ram_type: eq.ram_type || '',
      storage_type: eq.storage_type || '',
      storage_capacity: eq.storage_capacity || '',
      // Software
      os_name: eq.os_name || '',
      os_version: eq.os_version || '',
      os_license: eq.os_license || '',
      antivirus_name: eq.antivirus_name || '',
      antivirus_license: eq.antivirus_license || '',
      antivirus_expiry: eq.antivirus_expiry || '',
      // Network
      ip_address: eq.ip_address || '',
      mac_address: eq.mac_address || '',
      // Credentials
      windows_user: eq.windows_user || '',
      windows_password: eq.windows_password || '',
      email_account: eq.email_account || '',
      email_password: eq.email_password || '',
      cloud_user: eq.cloud_user || '',
      cloud_password: eq.cloud_password || ''
    });
    setCustomFieldValues(eq.custom_fields || {});
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
    setForm(initialFormState);
    setCustomFieldValues({});
    setBranches([]);
    setShowPasswords({ windows: false, email: false, cloud: false });
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
      'En Mantenimiento': 'status-reparacion',
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEquipment ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="hardware">Hardware</TabsTrigger>
                    <TabsTrigger value="software">Software</TabsTrigger>
                    <TabsTrigger value="credentials">Credenciales</TabsTrigger>
                    <TabsTrigger value="custom">Adicionales</TabsTrigger>
                  </TabsList>

                  {/* General Tab */}
                  <TabsContent value="general" className="space-y-4 mt-4">
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
                    </div>

                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea
                        value={form.observations}
                        onChange={(e) => setForm({...form, observations: e.target.value})}
                        placeholder="Notas adicionales sobre el equipo..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Hardware Tab */}
                  <TabsContent value="hardware" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Procesador</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Marca</Label>
                          <Input
                            value={form.processor_brand}
                            onChange={(e) => setForm({...form, processor_brand: e.target.value})}
                            placeholder="Intel, AMD..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Modelo</Label>
                          <Input
                            value={form.processor_model}
                            onChange={(e) => setForm({...form, processor_model: e.target.value})}
                            placeholder="Core i7-12700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Velocidad</Label>
                          <Input
                            value={form.processor_speed}
                            onChange={(e) => setForm({...form, processor_speed: e.target.value})}
                            placeholder="3.6 GHz"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-4">
                          <HardDrive className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium">Memoria RAM</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Capacidad</Label>
                            <Input
                              value={form.ram_capacity}
                              onChange={(e) => setForm({...form, ram_capacity: e.target.value})}
                              placeholder="16 GB"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={form.ram_type} onValueChange={(value) => setForm({...form, ram_type: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {RAM_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-4">
                          <HardDrive className="w-5 h-5 text-amber-600" />
                          <span className="font-medium">Almacenamiento</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={form.storage_type} onValueChange={(value) => setForm({...form, storage_type: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {STORAGE_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Capacidad</Label>
                            <Input
                              value={form.storage_capacity}
                              onChange={(e) => setForm({...form, storage_capacity: e.target.value})}
                              placeholder="512 GB"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Wifi className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Red</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Dirección IP</Label>
                          <Input
                            value={form.ip_address}
                            onChange={(e) => setForm({...form, ip_address: e.target.value})}
                            placeholder="192.168.1.100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Dirección MAC</Label>
                          <Input
                            value={form.mac_address}
                            onChange={(e) => setForm({...form, mac_address: e.target.value})}
                            placeholder="00:1A:2B:3C:4D:5E"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Software Tab */}
                  <TabsContent value="software" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Sistema Operativo</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={form.os_name}
                            onChange={(e) => setForm({...form, os_name: e.target.value})}
                            placeholder="Windows 11 Pro"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Versión</Label>
                          <Input
                            value={form.os_version}
                            onChange={(e) => setForm({...form, os_version: e.target.value})}
                            placeholder="22H2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Licencia</Label>
                          <Input
                            value={form.os_license}
                            onChange={(e) => setForm({...form, os_license: e.target.value})}
                            placeholder="XXXXX-XXXXX-XXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Antivirus</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={form.antivirus_name}
                            onChange={(e) => setForm({...form, antivirus_name: e.target.value})}
                            placeholder="Norton, McAfee, ESET..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Licencia</Label>
                          <Input
                            value={form.antivirus_license}
                            onChange={(e) => setForm({...form, antivirus_license: e.target.value})}
                            placeholder="Clave de licencia"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Vencimiento</Label>
                          <Input
                            type="date"
                            value={form.antivirus_expiry}
                            onChange={(e) => setForm({...form, antivirus_expiry: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Credentials Tab */}
                  <TabsContent value="credentials" className="space-y-4 mt-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Windows</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Usuario</Label>
                          <Input
                            value={form.windows_user}
                            onChange={(e) => setForm({...form, windows_user: e.target.value})}
                            placeholder="Usuario Windows"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Contraseña</Label>
                          <div className="relative">
                            <Input
                              type={showPasswords.windows ? "text" : "password"}
                              value={form.windows_password}
                              onChange={(e) => setForm({...form, windows_password: e.target.value})}
                              placeholder="••••••••"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPasswords({...showPasswords, windows: !showPasswords.windows})}
                            >
                              {showPasswords.windows ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium">Correo Electrónico</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Cuenta de Correo</Label>
                          <Input
                            value={form.email_account}
                            onChange={(e) => setForm({...form, email_account: e.target.value})}
                            placeholder="correo@empresa.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Contraseña</Label>
                          <div className="relative">
                            <Input
                              type={showPasswords.email ? "text" : "password"}
                              value={form.email_password}
                              onChange={(e) => setForm({...form, email_password: e.target.value})}
                              placeholder="••••••••"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPasswords({...showPasswords, email: !showPasswords.email})}
                            >
                              {showPasswords.email ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium">Nube / Cloud</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Usuario Cloud</Label>
                          <Input
                            value={form.cloud_user}
                            onChange={(e) => setForm({...form, cloud_user: e.target.value})}
                            placeholder="Usuario nube"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Contraseña</Label>
                          <div className="relative">
                            <Input
                              type={showPasswords.cloud ? "text" : "password"}
                              value={form.cloud_password}
                              onChange={(e) => setForm({...form, cloud_password: e.target.value})}
                              placeholder="••••••••"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setShowPasswords({...showPasswords, cloud: !showPasswords.cloud})}
                            >
                              {showPasswords.cloud ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Custom Fields Tab */}
                  <TabsContent value="custom" className="space-y-4 mt-4">
                    <CustomFieldsRenderer
                      entityType="equipment"
                      values={customFieldValues}
                      onChange={setCustomFieldValues}
                      showTitle={false}
                    />
                    <div className="p-4 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Configura campos adicionales en</span>
                        <a href="/custom-fields" className="text-primary hover:underline">Campos Personalizados</a>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
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
