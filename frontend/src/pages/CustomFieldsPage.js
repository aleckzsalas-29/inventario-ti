import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Plus, Settings, Trash2, Edit, Loader2, X, Type, Hash, Calendar, List, ToggleLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const ENTITY_TYPES = [
  { value: 'equipment', label: 'Equipos', icon: '💻' },
  { value: 'company', label: 'Empresas', icon: '🏢' },
  { value: 'employee', label: 'Empleados', icon: '👤' },
  { value: 'service', label: 'Servicios Externos', icon: '🌐' },
  { value: 'maintenance', label: 'Mantenimientos', icon: '🔧' },
  { value: 'quotation', label: 'Cotizaciones', icon: '📋' },
  { value: 'invoice', label: 'Facturas', icon: '🧾' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto', icon: Type },
  { value: 'number', label: 'Número', icon: Hash },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'select', label: 'Lista de opciones', icon: List },
  { value: 'boolean', label: 'Sí/No', icon: ToggleLeft },
  { value: 'password', label: 'Contraseña', icon: Lock }
];

export default function CustomFieldsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterEntity, setFilterEntity] = useState('');

  const [form, setForm] = useState({
    entity_type: '',
    name: '',
    field_type: 'text',
    options: '',
    required: false,
    category: '',
    placeholder: '',
    help_text: '',
    validation: {
      min_length: '',
      max_length: '',
      regex_pattern: '',
      regex_message: '',
      min_value: '',
      max_value: '',
      min_date: '',
      max_date: ''
    }
  });

  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [filterEntity]);

  const fetchFields = async () => {
    try {
      const params = filterEntity ? { entity_type: filterEntity } : {};
      const response = await api.get('/custom-fields', { params });
      setFields(response.data);
    } catch (error) {
      toast.error('Error al cargar campos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.entity_type || !form.name || !form.field_type) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    if (form.field_type === 'select' && !form.options.trim()) {
      toast.error('Ingrese las opciones para el campo de lista');
      return;
    }

    setSaving(true);
    try {
      // Build validation object only with non-empty values
      const validation = {};
      if (form.field_type === 'text' || form.field_type === 'password') {
        if (form.validation.min_length) validation.min_length = parseInt(form.validation.min_length);
        if (form.validation.max_length) validation.max_length = parseInt(form.validation.max_length);
        if (form.validation.regex_pattern) {
          validation.regex_pattern = form.validation.regex_pattern;
          validation.regex_message = form.validation.regex_message || 'Formato inválido';
        }
      }
      if (form.field_type === 'number') {
        if (form.validation.min_value !== '') validation.min_value = parseFloat(form.validation.min_value);
        if (form.validation.max_value !== '') validation.max_value = parseFloat(form.validation.max_value);
      }
      if (form.field_type === 'date') {
        if (form.validation.min_date) validation.min_date = form.validation.min_date;
        if (form.validation.max_date) validation.max_date = form.validation.max_date;
      }

      const payload = {
        entity_type: form.entity_type,
        name: form.name,
        field_type: form.field_type,
        options: form.field_type === 'select' ? form.options.split(',').map(o => o.trim()).filter(Boolean) : null,
        required: form.required,
        category: form.category || null,
        placeholder: form.placeholder || null,
        help_text: form.help_text || null,
        validation: Object.keys(validation).length > 0 ? validation : null
      };

      if (editingField) {
        await api.put(`/custom-fields/${editingField.id}`, payload);
        toast.success('Campo actualizado');
      } else {
        await api.post('/custom-fields', payload);
        toast.success('Campo creado');
      }
      setDialogOpen(false);
      resetForm();
      fetchFields();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (field) => {
    setEditingField(field);
    const v = field.validation || {};
    setForm({
      entity_type: field.entity_type,
      name: field.name,
      field_type: field.field_type,
      options: field.options ? field.options.join(', ') : '',
      required: field.required,
      category: field.category || '',
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      validation: {
        min_length: v.min_length?.toString() || '',
        max_length: v.max_length?.toString() || '',
        regex_pattern: v.regex_pattern || '',
        regex_message: v.regex_message || '',
        min_value: v.min_value?.toString() || '',
        max_value: v.max_value?.toString() || '',
        min_date: v.min_date || '',
        max_date: v.max_date || ''
      }
    });
    setShowValidation(!!field.validation && Object.keys(field.validation).length > 0);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este campo?')) return;
    try {
      await api.delete(`/custom-fields/${id}`);
      toast.success('Campo eliminado');
      fetchFields();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setEditingField(null);
    setForm({
      entity_type: '',
      name: '',
      field_type: 'text',
      options: '',
      required: false,
      category: ''
    });
  };

  const getEntityLabel = (type) => ENTITY_TYPES.find(e => e.value === type)?.label || type;
  const getEntityIcon = (type) => ENTITY_TYPES.find(e => e.value === type)?.icon || '📄';
  const getFieldTypeLabel = (type) => FIELD_TYPES.find(f => f.value === type)?.label || type;
  const getFieldTypeIcon = (type) => {
    const found = FIELD_TYPES.find(f => f.value === type);
    return found ? found.icon : Type;
  };

  const groupedFields = fields.reduce((acc, field) => {
    const entity = field.entity_type;
    if (!acc[entity]) acc[entity] = [];
    acc[entity].push(field);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="custom-fields-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campos Personalizados</h1>
          <p className="text-muted-foreground">Configura campos adicionales para cada sección del sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="new-field-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Campo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingField ? 'Editar Campo' : 'Crear Campo Personalizado'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Sección *</Label>
                <Select value={form.entity_type} onValueChange={(v) => setForm({...form, entity_type: v})}>
                  <SelectTrigger data-testid="entity-type-select">
                    <SelectValue placeholder="¿Dónde se usará este campo?" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(e => (
                      <SelectItem key={e.value} value={e.value}>
                        <span className="mr-2">{e.icon}</span> {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nombre del Campo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="Ej: Número de activo fijo"
                  data-testid="field-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Campo *</Label>
                <Select value={form.field_type} onValueChange={(v) => setForm({...form, field_type: v})}>
                  <SelectTrigger data-testid="field-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(f => {
                      const Icon = f.icon;
                      return (
                        <SelectItem key={f.value} value={f.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {f.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {form.field_type === 'select' && (
                <div className="space-y-2">
                  <Label>Opciones (separadas por coma) *</Label>
                  <Input
                    value={form.options}
                    onChange={(e) => setForm({...form, options: e.target.value})}
                    placeholder="Opción 1, Opción 2, Opción 3"
                    data-testid="field-options-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Categoría (opcional)</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  placeholder="Ej: Información adicional"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Campo obligatorio</p>
                  <p className="text-xs text-muted-foreground">El usuario deberá completarlo siempre</p>
                </div>
                <Switch
                  checked={form.required}
                  onCheckedChange={(checked) => setForm({...form, required: checked})}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} data-testid="save-field-btn">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingField ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap">Filtrar por sección:</Label>
            <Select value={filterEntity || "all"} onValueChange={(v) => setFilterEntity(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las secciones</SelectItem>
                {ENTITY_TYPES.map(e => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className="mr-2">{e.icon}</span> {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterEntity && (
              <Button variant="ghost" size="icon" onClick={() => setFilterEntity('')}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fields by Entity */}
      {fields.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedFields).map(([entity, entityFields]) => (
            <Card key={entity}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{getEntityIcon(entity)}</span>
                  {getEntityLabel(entity)}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({entityFields.length} campo{entityFields.length !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {entityFields.map((field) => {
                    const FieldIcon = getFieldTypeIcon(field.field_type);
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        data-testid={`field-item-${field.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-background">
                            <FieldIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {field.name}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getFieldTypeLabel(field.field_type)}
                              {field.options && ` • ${field.options.length} opciones`}
                              {field.category && ` • ${field.category}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(field)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(field.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No hay campos personalizados</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {filterEntity 
                  ? `No hay campos configurados para ${getEntityLabel(filterEntity)}`
                  : 'Crea campos adicionales para personalizar el sistema'}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer campo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
