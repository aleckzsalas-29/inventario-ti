import { useState, useEffect } from 'react';
import { companiesAPI, branchesAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, Building2, MapPin, Phone, Mail, Edit, Trash2, 
  MoreVertical, Loader2, Search, SlidersHorizontal, Download, Image
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import CustomFieldsRenderer, { CustomFieldsDisplay } from '../components/CustomFieldsRenderer';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Company Dialog
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', email: '', tax_id: '', logo_url: '' });
  const [companyCustomFields, setCompanyCustomFields] = useState({});
  const [savingCompany, setSavingCompany] = useState(false);
  
  // Branch Dialog
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ company_id: '', name: '', address: '', phone: '' });
  const [branchCustomFields, setBranchCustomFields] = useState({});
  const [savingBranch, setSavingBranch] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchBranches(selectedCompany.id);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response.data);
      if (response.data.length > 0 && !selectedCompany) {
        setSelectedCompany(response.data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (companyId) => {
    try {
      const response = await branchesAPI.getAll(companyId);
      setBranches(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Company handlers
  const handleSubmitCompany = async (e) => {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSavingCompany(true);
    try {
      const payload = { ...companyForm, custom_fields: companyCustomFields };
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, payload);
        toast.success('Empresa actualizada');
      } else {
        await companiesAPI.create(payload);
        toast.success('Empresa creada');
      }
      setCompanyDialogOpen(false);
      resetCompanyForm();
      fetchCompanies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      tax_id: company.tax_id || ''
    });
    setCompanyCustomFields(company.custom_fields || {});
    setCompanyDialogOpen(true);
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar esta empresa?')) return;
    try {
      await companiesAPI.delete(id);
      toast.success('Empresa desactivada');
      fetchCompanies();
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
      }
    } catch (error) {
      toast.error('Error al desactivar empresa');
    }
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setCompanyForm({ name: '', address: '', phone: '', email: '', tax_id: '' });
    setCompanyCustomFields({});
  };

  // Branch handlers
  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSavingBranch(true);
    try {
      const payload = { ...branchForm, custom_fields: branchCustomFields };
      if (editingBranch) {
        await branchesAPI.update(editingBranch.id, payload);
        toast.success('Sucursal actualizada');
      } else {
        await branchesAPI.create({ ...payload, company_id: selectedCompany.id });
        toast.success('Sucursal creada');
      }
      setBranchDialogOpen(false);
      resetBranchForm();
      fetchBranches(selectedCompany.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSavingBranch(false);
    }
  };

  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    setBranchForm({
      company_id: branch.company_id,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || ''
    });
    setBranchCustomFields(branch.custom_fields || {});
    setBranchDialogOpen(true);
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar esta sucursal?')) return;
    try {
      await branchesAPI.delete(id);
      toast.success('Sucursal desactivada');
      fetchBranches(selectedCompany.id);
    } catch (error) {
      toast.error('Error al desactivar sucursal');
    }
  };

  const resetBranchForm = () => {
    setEditingBranch(null);
    setBranchForm({ company_id: '', name: '', address: '', phone: '' });
    setBranchCustomFields({});
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="companies-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas y Sucursales</h1>
          <p className="text-muted-foreground">Administra las empresas y sus ubicaciones</p>
        </div>
        <Dialog open={companyDialogOpen} onOpenChange={(open) => { setCompanyDialogOpen(open); if (!open) resetCompanyForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-company-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCompany} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                  placeholder="Nombre de la empresa"
                  data-testid="company-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>RFC</Label>
                <Input
                  value={companyForm.tax_id}
                  onChange={(e) => setCompanyForm({...companyForm, tax_id: e.target.value})}
                  placeholder="Número de identificación fiscal"
                />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})}
                  placeholder="Dirección principal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              {/* Custom Fields */}
              <CustomFieldsRenderer
                entityType="company"
                values={companyCustomFields}
                onChange={setCompanyCustomFields}
              />
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Configura campos adicionales en</span>
                  <a href="/custom-fields" className="text-primary hover:underline">Campos Personalizados</a>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingCompany} data-testid="save-company-btn">
                  {savingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCompany ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companies List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Empresas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {filteredCompanies.length > 0 ? (
                <div className="space-y-2">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedCompany?.id === company.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedCompany(company)}
                      data-testid={`company-item-${company.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.tax_id && (
                            <p className="text-xs text-muted-foreground">RFC: {company.tax_id}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id); }} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay empresas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Company Details & Branches */}
        <div className="lg:col-span-2">
          {selectedCompany ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedCompany.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCompany.tax_id && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">RFC: {selectedCompany.tax_id}</span>
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedCompany.phone}</span>
                      </div>
                    )}
                    {selectedCompany.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedCompany.email}</span>
                      </div>
                    )}
                    {selectedCompany.address && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedCompany.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Sucursales
                  </CardTitle>
                  <Dialog open={branchDialogOpen} onOpenChange={(open) => { setBranchDialogOpen(open); if (!open) resetBranchForm(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="add-branch-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Sucursal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmitBranch} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nombre *</Label>
                          <Input
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                            placeholder="Nombre de la sucursal"
                            data-testid="branch-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dirección</Label>
                          <Input
                            value={branchForm.address}
                            onChange={(e) => setBranchForm({...branchForm, address: e.target.value})}
                            placeholder="Dirección de la sucursal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={branchForm.phone}
                            onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})}
                            placeholder="+1 234 567 890"
                          />
                        </div>

                        {/* Custom Fields for Branch */}
                        <CustomFieldsRenderer
                          entityType="branch"
                          values={branchCustomFields}
                          onChange={setBranchCustomFields}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setBranchDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={savingBranch} data-testid="save-branch-btn">
                            {savingBranch && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingBranch ? 'Actualizar' : 'Crear'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {branches.length > 0 ? (
                    <div className="space-y-3">
                      {branches.map((branch) => (
                        <div key={branch.id} className="p-4 rounded-lg border hover:bg-muted/50 transition-colors" data-testid={`branch-item-${branch.id}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{branch.name}</p>
                              {branch.address && (
                                <p className="text-sm text-muted-foreground">{branch.address}</p>
                              )}
                              {branch.phone && (
                                <p className="text-sm text-muted-foreground">{branch.phone}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditBranch(branch)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteBranch(branch.id)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Desactivar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay sucursales registradas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Selecciona una empresa</p>
                  <p className="text-sm">O crea una nueva para comenzar</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
