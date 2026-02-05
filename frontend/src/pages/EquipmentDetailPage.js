import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { 
  ArrowLeft, Monitor, Download, Plus, Clock, Wrench, AlertTriangle,
  FileText, Loader2, Calendar, Building2, User, Tag, KeyRound, Mail, 
  Cloud, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const LOG_TYPES = ['Mantenimiento', 'Incidencia', 'Cambio', 'Nota'];

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logForm, setLogForm] = useState({ log_type: 'Nota', description: '' });
  const [showPasswords, setShowPasswords] = useState({
    windows: false,
    email: false,
    cloud: false
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [eqRes, logsRes] = await Promise.all([
        equipmentAPI.getById(id),
        equipmentAPI.getLogs(id)
      ]);
      setEquipment(eqRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos del equipo');
      navigate('/equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logForm.description.trim()) {
      toast.error('Ingrese una descripción');
      return;
    }

    setSaving(true);
    try {
      await equipmentAPI.createLog(id, logForm);
      toast.success('Registro añadido a la bitácora');
      setDialogOpen(false);
      setLogForm({ log_type: 'Nota', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al guardar registro');
    } finally {
      setSaving(false);
    }
  };

  const downloadLogsPdf = async () => {
    try {
      const response = await reportsAPI.equipmentLogsPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bitacora_${equipment?.inventory_code || 'equipo'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Bitácora descargada');
    } catch (error) {
      toast.error('Error al descargar bitácora');
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      'Disponible': 'status-disponible',
      'Asignado': 'status-asignado',
      'En Mantenimiento': 'status-reparacion',
      'De Baja': 'status-baja'
    };
    return `status-badge ${classes[status] || ''}`;
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'Mantenimiento': return <Wrench className="w-4 h-4" />;
      case 'Incidencia': return <AlertTriangle className="w-4 h-4" />;
      case 'Cambio': return <Tag className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'Mantenimiento': return 'bg-amber-500';
      case 'Incidencia': return 'bg-red-500';
      case 'Cambio': return 'bg-blue-500';
      default: return 'bg-emerald-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="text-center py-12">
        <p>Equipo no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/equipment')} className="mt-4">
          Volver a Equipos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="equipment-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{equipment.inventory_code}</h1>
              <span className={getStatusBadge(equipment.status)}>
                {equipment.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              {equipment.equipment_type} - {equipment.brand} {equipment.model}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadLogsPdf} data-testid="download-logs-btn">
          <Download className="w-4 h-4 mr-2" />
          Descargar Bitácora
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Información del Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{equipment.brand}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{equipment.model}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de Serie</p>
                <p className="font-mono text-sm bg-muted px-2 py-1 rounded">{equipment.serial_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{equipment.equipment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adquisición</p>
                  <p className="font-medium">{equipment.acquisition_type}</p>
                </div>
              </div>
              {equipment.acquisition_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Adquirido: {new Date(equipment.acquisition_date).toLocaleDateString('es')}</span>
                </div>
              )}
              {equipment.provider && (
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{equipment.provider}</p>
                </div>
              )}
              {equipment.observations && (
                <div>
                  <p className="text-sm text-muted-foreground">Observaciones</p>
                  <p className="text-sm">{equipment.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{equipment.company_name || 'No asignada'}</p>
              </div>
              {equipment.branch_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Sucursal</p>
                  <p className="font-medium">{equipment.branch_name}</p>
                </div>
              )}
              {equipment.assigned_employee_name && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Asignado a</p>
                    <p className="font-medium">{equipment.assigned_employee_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credentials Card */}
          {(equipment.windows_user || equipment.email_account || equipment.cloud_user) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  Credenciales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Windows Credentials */}
                {(equipment.windows_user || equipment.windows_password) && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Windows</span>
                    </div>
                    {equipment.windows_user && (
                      <div className="text-sm mb-1">
                        <span className="text-muted-foreground">Usuario: </span>
                        <span className="font-mono">{equipment.windows_user}</span>
                      </div>
                    )}
                    {equipment.windows_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">
                          {showPasswords.windows ? equipment.windows_password : '••••••••'}
                        </span>
                        <button
                          onClick={() => setShowPasswords({...showPasswords, windows: !showPasswords.windows})}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.windows ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Email Credentials */}
                {(equipment.email_account || equipment.email_password) && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">Correo</span>
                    </div>
                    {equipment.email_account && (
                      <div className="text-sm mb-1">
                        <span className="text-muted-foreground">Cuenta: </span>
                        <span className="font-mono">{equipment.email_account}</span>
                      </div>
                    )}
                    {equipment.email_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">
                          {showPasswords.email ? equipment.email_password : '••••••••'}
                        </span>
                        <button
                          onClick={() => setShowPasswords({...showPasswords, email: !showPasswords.email})}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.email ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Cloud Credentials */}
                {(equipment.cloud_user || equipment.cloud_password) && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium">Nube</span>
                    </div>
                    {equipment.cloud_user && (
                      <div className="text-sm mb-1">
                        <span className="text-muted-foreground">Usuario: </span>
                        <span className="font-mono">{equipment.cloud_user}</span>
                      </div>
                    )}
                    {equipment.cloud_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">
                          {showPasswords.cloud ? equipment.cloud_password : '••••••••'}
                        </span>
                        <button
                          onClick={() => setShowPasswords({...showPasswords, cloud: !showPasswords.cloud})}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.cloud ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Logs / Bitácora */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Bitácora del Equipo
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="add-log-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Registro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Registro en Bitácora</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddLog} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Registro</Label>
                      <Select value={logForm.log_type} onValueChange={(value) => setLogForm({...logForm, log_type: value})}>
                        <SelectTrigger data-testid="log-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOG_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción *</Label>
                      <Textarea
                        value={logForm.description}
                        onChange={(e) => setLogForm({...logForm, description: e.target.value})}
                        placeholder="Describa el mantenimiento, incidencia o cambio realizado..."
                        rows={4}
                        data-testid="log-description-input"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving} data-testid="save-log-btn">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {logs.map((log, index) => (
                      <div key={log.id} className="relative pl-10" data-testid={`log-entry-${log.id}`}>
                        <div className={`absolute left-2 w-4 h-4 rounded-full ${getLogColor(log.log_type)} flex items-center justify-center`}>
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getLogIcon(log.log_type)}
                              <span className="font-medium">{log.log_type}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('es')}
                            </span>
                          </div>
                          <p className="text-sm">{log.description}</p>
                          {log.performed_by_name && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Por: {log.performed_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay registros en la bitácora</p>
                  <p className="text-sm">Añade el primer registro de este equipo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
