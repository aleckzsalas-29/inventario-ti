import { useState, useEffect } from 'react';
import { usersAPI, rolesAPI, companiesAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { 
  Plus, Users, Shield, Edit, Trash2, MoreVertical, Loader2, Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User Dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role_id: '', company_id: '' });
  const [savingUser, setSavingUser] = useState(false);
  
  // Role Dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] });
  const [savingRole, setSavingRole] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, companiesRes, permsRes] = await Promise.all([
        usersAPI.getAll(),
        rolesAPI.getAll(),
        companiesAPI.getAll(),
        rolesAPI.getPermissions()
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setCompanies(companiesRes.data);
      setPermissions(permsRes.data.permissions);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // User handlers
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!userForm.email || !userForm.name || (!editingUser && !userForm.password)) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSavingUser(true);
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, userForm);
        toast.success('Usuario actualizado');
      } else {
        await usersAPI.create(userForm);
        toast.success('Usuario creado');
      }
      setUserDialogOpen(false);
      resetUserForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSavingUser(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: '',
      name: user.name,
      role_id: user.role_id || '',
      company_id: user.company_id || ''
    });
    setUserDialogOpen(true);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar este usuario?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('Usuario desactivado');
      fetchData();
    } catch (error) {
      toast.error('Error al desactivar usuario');
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserForm({ email: '', password: '', name: '', role_id: '', company_id: '' });
  };

  // Role handlers
  const handleSubmitRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesAPI.update(editingRole.id, roleForm);
        toast.success('Rol actualizado');
      } else {
        await rolesAPI.create(roleForm);
        toast.success('Rol creado');
      }
      setRoleDialogOpen(false);
      resetRoleForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSavingRole(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
    setRoleDialogOpen(true);
  };

  const resetRoleForm = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: [] });
  };

  const togglePermission = (permKey) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
    }));
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(search) ||
      u.name?.toLowerCase().includes(search) ||
      u.role_name?.toLowerCase().includes(search)
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
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios y Roles</h1>
          <p className="text-muted-foreground">Administra usuarios y permisos del sistema</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Controls */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Dialog open={userDialogOpen} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) resetUserForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-user-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      value={userForm.name}
                      onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                      placeholder="Nombre completo"
                      data-testid="user-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      placeholder="usuario@ejemplo.com"
                      data-testid="user-email-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{editingUser ? 'Nueva Contraseña' : 'Contraseña *'}</Label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      placeholder={editingUser ? 'Dejar vacío para no cambiar' : '••••••••'}
                      data-testid="user-password-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={userForm.role_id} onValueChange={(value) => setUserForm({...userForm, role_id: value})}>
                      <SelectTrigger data-testid="user-role-select">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa (opcional)</Label>
                    <Select value={userForm.company_id || "none"} onValueChange={(value) => setUserForm({...userForm, company_id: value === "none" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin empresa</SelectItem>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={savingUser} data-testid="save-user-btn">
                      {savingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingUser ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="pt-6">
              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3">Nombre</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Rol</th>
                        <th className="pb-3">Empresa</th>
                        <th className="pb-3">Estado</th>
                        <th className="pb-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} data-testid={`user-row-${user.id}`}>
                          <td className="font-medium">{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                              {user.role_name || 'Sin rol'}
                            </span>
                          </td>
                          <td>{user.company_name || '-'}</td>
                          <td>
                            <span className={`status-badge ${user.is_active ? 'status-disponible' : 'status-baja'}`}>
                              {user.is_active ? 'Activo' : 'Inactivo'}
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
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
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
                  <h3 className="font-semibold mb-1">No hay usuarios</h3>
                  <p className="text-muted-foreground text-sm">Crea tu primer usuario</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          {/* Role Controls */}
          <div className="flex justify-end">
            <Dialog open={roleDialogOpen} onOpenChange={(open) => { setRoleDialogOpen(open); if (!open) resetRoleForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-role-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Rol
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitRole} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Rol *</Label>
                      <Input
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                        placeholder="Ej: Supervisor"
                        data-testid="role-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                        placeholder="Descripción del rol"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Permisos</Label>
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border bg-muted/30 max-h-[300px] overflow-y-auto">
                      {permissions.map((perm) => (
                        <div key={perm.key} className="flex items-start gap-3">
                          <Checkbox
                            id={perm.key}
                            checked={roleForm.permissions.includes(perm.key)}
                            onCheckedChange={() => togglePermission(perm.key)}
                          />
                          <div className="grid gap-0.5">
                            <label htmlFor={perm.key} className="text-sm font-medium cursor-pointer">
                              {perm.label}
                            </label>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={savingRole} data-testid="save-role-btn">
                      {savingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingRole ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id} data-testid={`role-card-${role.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        {role.is_system && (
                          <span className="text-xs text-muted-foreground">Rol del sistema</span>
                        )}
                      </div>
                    </div>
                    {!role.is_system && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRole(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {role.permissions?.slice(0, 4).map((perm) => (
                      <span key={perm} className="text-xs px-2 py-1 rounded bg-muted">
                        {perm}
                      </span>
                    ))}
                    {role.permissions?.length > 4 && (
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        +{role.permissions.length - 4} más
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
