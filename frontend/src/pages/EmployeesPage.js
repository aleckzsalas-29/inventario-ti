import { useState, useEffect } from 'react';
import { employeesAPI, companiesAPI, branchesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Search, Users, Edit, Trash2, MoreVertical, Loader2, X, Mail, Briefcase, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import CustomFieldsRenderer from '../components/CustomFieldsRenderer';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  // Form
  const [form, setForm] = useState({
    company_id: '',
    branch_id: '',
    first_name: '',
    last_name: '',
    position: '',
    department: '',
    email: ''
  });
  
  // Custom fields
  const [customFieldValues, setCustomFieldValues] = useState({});

  useEffect(() => {
    fetchData();
  }, [filterCompany, filterBranch]);

  const fetchData = async () => {
    try {
      const [empRes, compRes] = await Promise.all([
        employeesAPI.getAll({ 
          company_id: filterCompany || undefined,
          branch_id: filterBranch || undefined
        }),
        companiesAPI.getAll()
      ]);
      setEmployees(empRes.data);
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
    if (!form.company_id || !form.first_name || !form.last_name) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, custom_fields: customFieldValues };
      if (editingEmployee) {
        await employeesAPI.update(editingEmployee.id, payload);
        toast.success('Empleado actualizado');
      } else {
        await employeesAPI.create(payload);
        toast.success('Empleado registrado');
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

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setForm({
      company_id: emp.company_id,
      branch_id: emp.branch_id || '',
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position || '',
      department: emp.department || '',
      email: emp.email || ''
    });
    setCustomFieldValues(emp.custom_fields || {});
    fetchBranches(emp.company_id);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar este empleado?')) return;
    try {
      await employeesAPI.delete(id);
      toast.success('Empleado desactivado');
      fetchData();
    } catch (error) {
      toast.error('Error al desactivar empleado');
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setForm({
      company_id: '',
      branch_id: '',
      first_name: '',
      last_name: '',
      position: '',
      department: '',
      email: ''
    });
    setCustomFieldValues({});
    setBranches([]);
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(search) ||
      emp.last_name?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search) ||
      emp.position?.toLowerCase().includes(search)
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
    <div className="space-y-6" data-testid="employees-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="text-muted-foreground">Administra los empleados de las empresas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-employee-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
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
                    <SelectTrigger data-testid="employee-company-select">
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
                  <Label>Sucursal</Label>
                  <Select value={form.branch_id} onValueChange={(value) => setForm({...form, branch_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
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
                  <Label>Nombres *</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({...form, first_name: e.target.value})}
                    placeholder="Juan"
                    data-testid="employee-firstname-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos *</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({...form, last_name: e.target.value})}
                    placeholder="Pérez"
                    data-testid="employee-lastname-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={form.position}
                    onChange={(e) => setForm({...form, position: e.target.value})}
                    placeholder="Desarrollador"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm({...form, department: e.target.value})}
                    placeholder="TI"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="empleado@empresa.com"
                />
              </div>

              {/* Custom Fields */}
              <CustomFieldsRenderer
                entityType="employee"
                values={customFieldValues}
                onChange={setCustomFieldValues}
              />
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Configura campos adicionales en</span>
                  <a href="/custom-fields" className="text-primary hover:underline">Campos Personalizados</a>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="save-employee-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEmployee ? 'Actualizar' : 'Registrar'}
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
                  placeholder="Buscar por nombre, DNI, cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="employee-search-input"
                />
              </div>
            </div>
            <Select value={filterCompany || "all"} onValueChange={(value) => { setFilterCompany(value === "all" ? "" : value); setFilterBranch(''); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterCompany || searchQuery) && (
              <Button variant="ghost" size="icon" onClick={() => { setFilterCompany(''); setFilterBranch(''); setSearchQuery(''); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Nombre Completo</th>
                    <th className="pb-3">Cargo</th>
                    <th className="pb-3">Departamento</th>
                    <th className="pb-3">Empresa</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} data-testid={`employee-row-${emp.id}`}>
                      <td className="font-medium">{emp.first_name} {emp.last_name}</td>
                      <td>{emp.position || '-'}</td>
                      <td>{emp.department || '-'}</td>
                      <td>{emp.company_name}</td>
                      <td className="text-sm text-muted-foreground">{emp.email || '-'}</td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(emp)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(emp.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
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
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No hay empleados</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterCompany
                  ? 'No se encontraron empleados con los filtros aplicados'
                  : 'Comienza registrando tu primer empleado'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
