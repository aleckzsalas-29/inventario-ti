import { useState, useEffect } from 'react';
import { assignmentsAPI, equipmentAPI, employeesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { 
  Plus, UserCheck, ArrowLeftRight, Loader2, Check, X, Calendar, Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [form, setForm] = useState({
    equipment_id: '',
    employee_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    observations: ''
  });
  const [returnObservations, setReturnObservations] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [assignRes, eqRes, empRes] = await Promise.all([
        assignmentsAPI.getAll({ status: filterStatus || undefined }),
        equipmentAPI.getAll({ status: 'Disponible' }),
        employeesAPI.getAll()
      ]);
      setAssignments(assignRes.data);
      setEquipment(eqRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment_id || !form.employee_id || !form.delivery_date) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      await assignmentsAPI.create(form);
      toast.success('Equipo asignado correctamente');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al asignar equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedAssignment) return;

    setSaving(true);
    try {
      await assignmentsAPI.return(selectedAssignment.id, returnObservations);
      toast.success('Equipo devuelto correctamente');
      setReturnDialogOpen(false);
      setSelectedAssignment(null);
      setReturnObservations('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al devolver equipo');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      equipment_id: '',
      employee_id: '',
      delivery_date: new Date().toISOString().split('T')[0],
      observations: ''
    });
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      a.equipment_code?.toLowerCase().includes(search) ||
      a.employee_name?.toLowerCase().includes(search)
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
    <div className="space-y-6" data-testid="assignments-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Asignaciones</h1>
          <p className="text-muted-foreground">Gestiona las asignaciones de equipos a empleados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-assignment-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Asignación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Equipo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Equipo Disponible *</Label>
                <Select value={form.equipment_id} onValueChange={(value) => setForm({...form, equipment_id: value})}>
                  <SelectTrigger data-testid="assignment-equipment-select">
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
                <Label>Empleado *</Label>
                <Select value={form.employee_id} onValueChange={(value) => setForm({...form, employee_id: value})}>
                  <SelectTrigger data-testid="assignment-employee-select">
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} - {emp.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Entrega *</Label>
                <Input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({...form, delivery_date: e.target.value})}
                  data-testid="assignment-date-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={form.observations}
                  onChange={(e) => setForm({...form, observations: e.target.value})}
                  placeholder="Notas sobre la asignación..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-assignment-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Asignar
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
                  placeholder="Buscar por equipo o empleado..."
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
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Activa">Activas</SelectItem>
                <SelectItem value="Finalizada">Finalizadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Equipo</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Empleado</th>
                    <th className="pb-3">Fecha Entrega</th>
                    <th className="pb-3">Fecha Devolución</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assign) => (
                    <tr key={assign.id} data-testid={`assignment-row-${assign.id}`}>
                      <td className="font-medium">{assign.equipment_code}</td>
                      <td>{assign.equipment_type}</td>
                      <td>{assign.employee_name}</td>
                      <td>{new Date(assign.delivery_date).toLocaleDateString('es')}</td>
                      <td>
                        {assign.return_date 
                          ? new Date(assign.return_date).toLocaleDateString('es')
                          : '-'
                        }
                      </td>
                      <td>
                        <span className={`status-badge ${
                          assign.status === 'Activa' ? 'status-asignado' : 'status-disponible'
                        }`}>
                          {assign.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {assign.status === 'Activa' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedAssignment(assign); setReturnDialogOpen(true); }}
                            data-testid={`return-btn-${assign.id}`}
                          >
                            <ArrowLeftRight className="w-4 h-4 mr-2" />
                            Devolver
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
                <UserCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay asignaciones</h3>
              <p className="text-muted-foreground text-sm">
                {filterStatus || searchQuery
                  ? 'No se encontraron asignaciones con los filtros aplicados'
                  : 'Comienza asignando equipos a empleados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={(open) => { setReturnDialogOpen(open); if (!open) { setSelectedAssignment(null); setReturnObservations(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver Equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssignment && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedAssignment.equipment_code}</p>
                <p className="text-sm text-muted-foreground">
                  Asignado a: {selectedAssignment.employee_name}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Observaciones de Devolución</Label>
              <Textarea
                value={returnObservations}
                onChange={(e) => setReturnObservations(e.target.value)}
                placeholder="Estado del equipo al momento de devolución..."
                rows={3}
                data-testid="return-observations-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReturn} disabled={saving} data-testid="confirm-return-btn">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
