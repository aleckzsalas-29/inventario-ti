import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentAPI, maintenanceAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { 
  ArrowLeft, Monitor, Download, Plus, Clock, Wrench, 
  FileText, Loader2, Calendar, Building2, User, Tag, KeyRound, Mail, 
  Cloud, Eye, EyeOff, Cpu, HardDrive, Wifi, Shield, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';

const LOG_TYPES = ['Mantenimiento', 'Incidencia', 'Cambio', 'Nota'];

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
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
      const [eqRes, logsRes, maintRes] = await Promise.all([
        equipmentAPI.getById(id),
        equipmentAPI.getLogs(id),
        maintenanceAPI.getHistory(id)
      ]);
      setEquipment(eqRes.data);
      setLogs(logsRes.data);
      setMaintenanceHistory(maintRes.data);
    } catch (error) {
      toast.error('Error al cargar datos del equipo');
      navigate('/equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logForm.description) {
      toast.error('Ingrese una descripción');
      return;
    }
    setSaving(true);
    try {
      await equipmentAPI.addLog(id, logForm);
      toast.success('Registro agregado');
      setDialogOpen(false);
      setLogForm({ log_type: 'Nota', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al agregar registro');
    } finally {
      setSaving(false);
    }
  };

  const downloadLogs = async () => {
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
      toast.error('Error al descargar');
    }
  };

  const downloadMaintenanceHistory = async () => {
    try {
      const response = await reportsAPI.maintenanceHistoryPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mantenimientos_${equipment?.inventory_code || 'equipo'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Historial descargado');
    } catch (error) {
      toast.error('Error al descargar');
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

  const getLogIcon = (logType) => {
    switch (logType) {
      case 'Mantenimiento': return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'Incidencia': return <ClipboardCheck className="w-4 h-4 text-red-500" />;
      case 'Cambio': return <Tag className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMaintenanceTypeColor = (type) => {
    const colors = {
      'Preventivo': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Correctivo': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'Reparacion': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Otro': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return colors[type] || colors['Otro'];
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
        <p className="text-muted-foreground">Equipo no encontrado</p>
        <Button variant="link" onClick={() => navigate('/equipment')}>
          Volver a equipos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="equipment-detail-page">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{equipment.inventory_code}</h1>
              <span className={getStatusBadge(equipment.status)}>{equipment.status}</span>
            </div>
            <p className="text-muted-foreground">
              {equipment.equipment_type} | {equipment.brand} {equipment.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadLogs}>
            <Download className="w-4 h-4 mr-2" />
            Bitácora PDF
          </Button>
          <Button variant="outline" onClick={downloadMaintenanceHistory}>
            <Wrench className="w-4 h-4 mr-2" />
            Mantenimientos PDF
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Serie</p>
                  <p className="font-mono text-sm">{equipment.serial_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{equipment.equipment_type}</p>
                </div>
              </div>
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
              {equipment.observations && (
                <div>
                  <p className="text-sm text-muted-foreground">Observaciones</p>
                  <p className="text-sm">{equipment.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hardware Specs */}
          {(equipment.processor_brand || equipment.ram_capacity || equipment.storage_type) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  Especificaciones de Hardware
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {equipment.processor_brand && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Procesador</p>
                    <p className="font-medium text-sm">
                      {equipment.processor_brand} {equipment.processor_model}
                      {equipment.processor_speed && ` @ ${equipment.processor_speed}`}
                    </p>
                  </div>
                )}
                {equipment.ram_capacity && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Memoria RAM</p>
                    <p className="font-medium text-sm">
                      {equipment.ram_capacity} {equipment.ram_type && `(${equipment.ram_type})`}
                    </p>
                  </div>
                )}
                {equipment.storage_type && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Almacenamiento</p>
                    <p className="font-medium text-sm">
                      {equipment.storage_type} {equipment.storage_capacity}
                    </p>
                  </div>
                )}
                {(equipment.ip_address || equipment.mac_address) && (
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Red</p>
                    {equipment.ip_address && <p className="font-mono text-sm">IP: {equipment.ip_address}</p>}
                    {equipment.mac_address && <p className="font-mono text-sm">MAC: {equipment.mac_address}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Software */}
          {(equipment.os_name || equipment.antivirus_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Software
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {equipment.os_name && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Sistema Operativo</p>
                    <p className="font-medium text-sm">
                      {equipment.os_name} {equipment.os_version}
                    </p>
                    {equipment.os_license && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">Lic: {equipment.os_license}</p>
                    )}
                  </div>
                )}
                {equipment.antivirus_name && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs text-muted-foreground mb-1">Antivirus</p>
                    <p className="font-medium text-sm">{equipment.antivirus_name}</p>
                    {equipment.antivirus_expiry && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence: {equipment.antivirus_expiry}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Location */}
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
                {(equipment.windows_user || equipment.windows_password) && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Windows</span>
                    </div>
                    {equipment.windows_user && (
                      <p className="text-sm"><span className="text-muted-foreground">Usuario: </span><span className="font-mono">{equipment.windows_user}</span></p>
                    )}
                    {equipment.windows_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">{showPasswords.windows ? equipment.windows_password : '••••••••'}</span>
                        <button onClick={() => setShowPasswords({...showPasswords, windows: !showPasswords.windows})} className="text-muted-foreground hover:text-foreground">
                          {showPasswords.windows ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {(equipment.email_account || equipment.email_password) && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">Correo</span>
                    </div>
                    {equipment.email_account && (
                      <p className="text-sm"><span className="text-muted-foreground">Cuenta: </span><span className="font-mono">{equipment.email_account}</span></p>
                    )}
                    {equipment.email_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">{showPasswords.email ? equipment.email_password : '••••••••'}</span>
                        <button onClick={() => setShowPasswords({...showPasswords, email: !showPasswords.email})} className="text-muted-foreground hover:text-foreground">
                          {showPasswords.email ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {(equipment.cloud_user || equipment.cloud_password) && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium">Nube</span>
                    </div>
                    {equipment.cloud_user && (
                      <p className="text-sm"><span className="text-muted-foreground">Usuario: </span><span className="font-mono">{equipment.cloud_user}</span></p>
                    )}
                    {equipment.cloud_password && (
                      <div className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">Contraseña: </span>
                        <span className="font-mono">{showPasswords.cloud ? equipment.cloud_password : '••••••••'}</span>
                        <button onClick={() => setShowPasswords({...showPasswords, cloud: !showPasswords.cloud})} className="text-muted-foreground hover:text-foreground">
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

        {/* Right Column - Logs & Maintenance History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historial del Equipo</CardTitle>
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
                        <SelectTrigger>
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
                      <Label>Descripción</Label>
                      <Textarea
                        value={logForm.description}
                        onChange={(e) => setLogForm({...logForm, description: e.target.value})}
                        placeholder="Describa el evento o actividad..."
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
              <Tabs defaultValue="logs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="logs">Bitácora General ({logs.length})</TabsTrigger>
                  <TabsTrigger value="maintenance">Mantenimientos ({maintenanceHistory.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-4">
                  {logs.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors" data-testid={`log-item-${log.id}`}>
                          <div className="flex-shrink-0 mt-1">
                            {getLogIcon(log.log_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{log.log_type}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('es')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{log.description}</p>
                            {log.performed_by_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Por: {log.performed_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay registros en la bitácora</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="maintenance" className="mt-4">
                  {maintenanceHistory.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {maintenanceHistory.map((maint) => (
                        <div key={maint.id} className="p-4 rounded-lg border" data-testid={`maintenance-item-${maint.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMaintenanceTypeColor(maint.maintenance_type)}`}>
                                {maint.maintenance_type}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                maint.status === 'Finalizado' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                  : maint.status === 'En Proceso'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {maint.status}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(maint.created_at).toLocaleDateString('es')}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{maint.description}</p>
                          
                          {/* Additional details based on type */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {maint.technician && (
                              <div>
                                <span className="text-muted-foreground">Técnico: </span>
                                {maint.technician}
                              </div>
                            )}
                            {maint.repair_time_hours && (
                              <div>
                                <span className="text-muted-foreground">Tiempo: </span>
                                {maint.repair_time_hours} hrs
                              </div>
                            )}
                            {maint.problem_diagnosis && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Diagnóstico: </span>
                                {maint.problem_diagnosis}
                              </div>
                            )}
                            {maint.solution_applied && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Solución: </span>
                                {maint.solution_applied}
                              </div>
                            )}
                            {maint.next_maintenance_date && (
                              <div>
                                <span className="text-muted-foreground">Próximo: </span>
                                {maint.next_maintenance_date}
                              </div>
                            )}
                            {maint.completed_at && (
                              <div>
                                <span className="text-muted-foreground">Completado: </span>
                                {new Date(maint.completed_at).toLocaleDateString('es')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay historial de mantenimientos</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
