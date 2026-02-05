import { useState, useEffect } from 'react';
import { maintenanceAPI, equipmentAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Wrench, Loader2, Search, Play, Check, X
} from 'lucide-react';
import { toast } from 'sonner';

const MAINTENANCE_TYPES = [
  { value: 'Preventivo', label: 'Preventivo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'Correctivo', label: 'Correctivo', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'Reparacion', label: 'Reparación', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'Otro', label: 'Otro', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' }
];

const STATUS_OPTIONS = [
  { value: 'Pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'En Proceso', label: 'En Proceso', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'Finalizado', label: 'Finalizado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' }
];

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [form, setForm] = useState({
    equipment_id: '',
    maintenance_type: 'Preventivo',
    description: '',
    technician: '',
    parts_used: '',
    next_maintenance_date: ''
  });
  const [completeNotes, setCompleteNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType]);

  const fetchData = async () => {
    try {
      const [logsRes, eqRes] = await Promise.all([
        maintenanceAPI.getAll({ 
          status: filterStatus || undefined,
          maintenance_type: filterType || undefined 
        }),
        equipmentAPI.getAll()
      ]);
      setLogs(logsRes.data);
      setEquipment(eqRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id || !form.description) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      await maintenanceAPI.create(form);
      toast.success('Bitácora de mantenimiento creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear registro');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (log) => {
    try {
      await maintenanceAPI.start(log.id);
      toast.success('Mantenimiento iniciado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar mantenimiento');
    }
  };

  const handleComplete = async () => {
    if (!selectedLog) return;

    setSaving(true);
    try {
      await maintenanceAPI.complete(selectedLog.id, completeNotes || undefined);
      toast.success('Mantenimiento finalizado');
      setCompleteDialogOpen(false);
      setSelectedLog(null);
      setCompleteNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al finalizar mantenimiento');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      equipment_id: '',
      maintenance_type: 'Preventivo',
      description: '',
      technician: '',
      parts_used: '',
      next_maintenance_date: ''
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.equipment_code?.toLowerCase().includes(search) ||
      log.description?.toLowerCase().includes(search) ||
      log.technician?.toLowerCase().includes(search)
    );
  });

  const getTypeColor = (type) => {
    const found = MAINTENANCE_TYPES.find(t => t.value === type);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="maintenance-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bitácoras de Mantenimiento</h1>
          <p className="text-muted-foreground">Gestiona los mantenimientos de equipos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-maintenance-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Mantenimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Bitácora de Mantenimiento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Equipo *</Label>
                <Select value={form.equipment_id} onValueChange={(value) => setForm({...form, equipment_id: value})}>
                  <SelectTrigger data-testid="maintenance-equipment-select">
                    <SelectValue placeholder="Seleccionar equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.inventory_code} - {eq.equipment_type} ({eq.brand})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Mantenimiento *</Label>
                <Select value={form.maintenance_type} onValueChange={(value) => setForm({...form, maintenance_type: value})}>
                  <SelectTrigger data-testid="maintenance-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Describa el mantenimiento a realizar..."
                  rows={3}
                  data-testid="maintenance-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Técnico</Label>
                  <Input
                    value={form.technician}
                    onChange={(e) => setForm({...form, technician: e.target.value})}
                    placeholder="Nombre del técnico"
                    data-testid="maintenance-technician-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Próximo Mantenimiento</Label>
                  <Input
                    type="date"
                    value={form.next_maintenance_date}
                    onChange={(e) => setForm({...form, next_maintenance_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Partes/Materiales Utilizados</Label>
                <Textarea
                  value={form.parts_used}
                  onChange={(e) => setForm({...form, parts_used: e.target.value})}
                  placeholder="Lista de partes o materiales..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-maintenance-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear
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
                  placeholder="Buscar por equipo, descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]" data-testid="filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MAINTENANCE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]" data-testid="filter-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterType || filterStatus) && (
              <Button variant="ghost" size="icon" onClick={() => { setFilterType(''); setFilterStatus(''); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Equipo</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Descripción</th>
                    <th className="pb-3">Técnico</th>
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} data-testid={`maintenance-row-${log.id}`}>
                      <td className="font-medium">{log.equipment_code}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.maintenance_type)}`}>
                          {log.maintenance_type}
                        </span>
                      </td>
                      <td className="max-w-[250px] truncate">{log.description}</td>
                      <td>{log.technician || '-'}</td>
                      <td>{new Date(log.created_at).toLocaleDateString('es')}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.status === 'Pendiente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStart(log)}
                              data-testid={`start-maintenance-btn-${log.id}`}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          {log.status !== 'Finalizado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { 
                                setSelectedLog(log); 
                                setCompleteNotes('');
                                setCompleteDialogOpen(true); 
                              }}
                              data-testid={`complete-maintenance-btn-${log.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Wrench className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay mantenimientos</h3>
              <p className="text-muted-foreground text-sm">
                {filterStatus || filterType || searchQuery
                  ? 'No se encontraron registros con los filtros aplicados'
                  : 'No hay bitácoras de mantenimiento registradas'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={(open) => { setCompleteDialogOpen(open); if (!open) { setSelectedLog(null); setCompleteNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Mantenimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLog && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedLog.equipment_code}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedLog.maintenance_type)}`}>
                    {selectedLog.maintenance_type}
                  </span>
                  <span className="ml-2">{selectedLog.description}</span>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas de Finalización (opcional)</Label>
              <Textarea
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Observaciones adicionales sobre el trabajo realizado..."
                rows={3}
                data-testid="complete-notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleComplete} disabled={saving} data-testid="confirm-complete-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Finalizar Mantenimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
