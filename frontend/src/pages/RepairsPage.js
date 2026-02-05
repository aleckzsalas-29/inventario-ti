import { useState, useEffect } from 'react';
import { repairsAPI, equipmentAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Wrench, Loader2, Search, Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [form, setForm] = useState({
    equipment_id: '',
    reason: '',
    service_provider: '',
    cost: ''
  });
  const [finishForm, setFinishForm] = useState({
    exit_observations: '',
    cost: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [repRes, eqRes] = await Promise.all([
        repairsAPI.getAll({ status: filterStatus || undefined }),
        equipmentAPI.getAll({ status: 'Disponible' })
      ]);
      setRepairs(repRes.data);
      setEquipment(eqRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id || !form.reason) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      await repairsAPI.create({
        ...form,
        cost: form.cost ? parseFloat(form.cost) : 0
      });
      toast.success('Equipo enviado a reparación');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar reparación');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!selectedRepair) return;

    setSaving(true);
    try {
      await repairsAPI.finish(selectedRepair.id, {
        exit_observations: finishForm.exit_observations,
        cost: finishForm.cost ? parseFloat(finishForm.cost) : undefined
      });
      toast.success('Reparación finalizada');
      setFinishDialogOpen(false);
      setSelectedRepair(null);
      setFinishForm({ exit_observations: '', cost: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al finalizar reparación');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      equipment_id: '',
      reason: '',
      service_provider: '',
      cost: ''
    });
  };

  const filteredRepairs = repairs.filter(r => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      r.equipment_code?.toLowerCase().includes(search) ||
      r.reason?.toLowerCase().includes(search) ||
      r.service_provider?.toLowerCase().includes(search)
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
    <div className="space-y-6" data-testid="repairs-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reparaciones</h1>
          <p className="text-muted-foreground">Gestiona las reparaciones de equipos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-repair-btn">
              <Plus className="w-4 h-4 mr-2" />
              Enviar a Reparación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Equipo a Reparación</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Equipo *</Label>
                <Select value={form.equipment_id} onValueChange={(value) => setForm({...form, equipment_id: value})}>
                  <SelectTrigger data-testid="repair-equipment-select">
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
                <Label>Motivo de Reparación *</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({...form, reason: e.target.value})}
                  placeholder="Describa el problema o falla..."
                  rows={3}
                  data-testid="repair-reason-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor de Servicio</Label>
                  <Input
                    value={form.service_provider}
                    onChange={(e) => setForm({...form, service_provider: e.target.value})}
                    placeholder="Técnico o empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Estimado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({...form, cost: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-repair-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Registrar
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
                  placeholder="Buscar por equipo, motivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="En Proceso">En Proceso</SelectItem>
                <SelectItem value="Finalizada">Finalizadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Repairs Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredRepairs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Equipo</th>
                    <th className="pb-3">Motivo</th>
                    <th className="pb-3">Proveedor</th>
                    <th className="pb-3">Fecha Ingreso</th>
                    <th className="pb-3">Fecha Salida</th>
                    <th className="pb-3">Costo</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRepairs.map((repair) => (
                    <tr key={repair.id} data-testid={`repair-row-${repair.id}`}>
                      <td className="font-medium">{repair.equipment_code}</td>
                      <td className="max-w-[200px] truncate">{repair.reason}</td>
                      <td>{repair.service_provider || '-'}</td>
                      <td>{new Date(repair.entry_date).toLocaleDateString('es')}</td>
                      <td>
                        {repair.exit_date 
                          ? new Date(repair.exit_date).toLocaleDateString('es')
                          : '-'
                        }
                      </td>
                      <td>${repair.cost?.toFixed(2) || '0.00'}</td>
                      <td>
                        <span className={`status-badge ${
                          repair.status === 'En Proceso' ? 'status-reparacion' : 'status-disponible'
                        }`}>
                          {repair.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {repair.status === 'En Proceso' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { 
                              setSelectedRepair(repair); 
                              setFinishForm({ exit_observations: '', cost: repair.cost?.toString() || '' });
                              setFinishDialogOpen(true); 
                            }}
                            data-testid={`finish-repair-btn-${repair.id}`}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Finalizar
                          </Button>
                        )}
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
              <h3 className="font-semibold mb-1">No hay reparaciones</h3>
              <p className="text-muted-foreground text-sm">
                {filterStatus || searchQuery
                  ? 'No se encontraron reparaciones con los filtros aplicados'
                  : 'No hay equipos en reparación'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finish Dialog */}
      <Dialog open={finishDialogOpen} onOpenChange={(open) => { setFinishDialogOpen(open); if (!open) { setSelectedRepair(null); setFinishForm({ exit_observations: '', cost: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Reparación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRepair && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedRepair.equipment_code}</p>
                <p className="text-sm text-muted-foreground">
                  Motivo: {selectedRepair.reason}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observaciones de Salida</Label>
              <Textarea
                value={finishForm.exit_observations}
                onChange={(e) => setFinishForm({...finishForm, exit_observations: e.target.value})}
                placeholder="Trabajo realizado, estado del equipo..."
                rows={3}
                data-testid="finish-observations-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Costo Final</Label>
              <Input
                type="number"
                step="0.01"
                value={finishForm.cost}
                onChange={(e) => setFinishForm({...finishForm, cost: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFinishDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFinish} disabled={saving} data-testid="confirm-finish-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Finalizar Reparación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
