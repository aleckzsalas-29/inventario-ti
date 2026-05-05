import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Bell, Send, Clock, Settings, History, Play, CheckCircle, AlertTriangle, Mail, Building2, Ticket } from "lucide-react";
import api from "../lib/api";

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>
);

function CustomRecipients({ recipients, newRecipient, setNewRecipient, onAdd, onRemove }) {
  return (
    <div className="space-y-3 mt-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={newRecipient}
          onChange={(e) => setNewRecipient(e.target.value)}
          data-testid="custom-recipient-input"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
        />
        <Button type="button" variant="outline" size="sm" data-testid="add-recipient-btn" onClick={onAdd}>
          Agregar
        </Button>
      </div>
      {recipients.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recipients.map((email, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {email}
              <button type="button" className="hover:text-red-500 ml-1" onClick={() => onRemove(idx)}>x</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Agrega correos y haz clic en "Guardar Configuración"</p>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companyOverview, setCompanyOverview] = useState([]);

  const [newRecipient, setNewRecipient] = useState("");

  const addRecipient = () => {
    if (newRecipient && newRecipient.includes("@")) {
      const current = settings.custom_recipients || [];
      if (!current.includes(newRecipient)) {
        setSettings(p => ({ ...p, custom_recipients: [...current, newRecipient] }));
      }
      setNewRecipient("");
    }
  };

  const removeRecipient = (idx) => {
    setSettings(p => ({
      ...p,
      custom_recipients: (p.custom_recipients || []).filter((_, i) => i !== idx)
    }));
  };

  const loadCompanies = useCallback(async () => {
    try {
      const [companiesRes, overviewRes] = await Promise.all([
        api.get("/companies"),
        api.get("/notifications/settings/all-companies")
      ]);
      setCompanies(companiesRes.data || []);
      setCompanyOverview(overviewRes.data || []);
      if (companiesRes.data?.length > 0 && !selectedCompany) {
        setSelectedCompany(companiesRes.data[0].id);
      }
    } catch (err) {
      console.error("Error loading companies:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const params = selectedCompany ? `?company_id=${selectedCompany}` : '';
      const [settingsRes, statusRes, historyRes, alertsRes] = await Promise.all([
        api.get(`/notifications/settings${params}`),
        api.get("/notifications/scheduler/status"),
        api.get("/notifications/history"),
        api.get("/notifications/check")
      ]);
      setSettings(settingsRes.data);
      setSchedulerStatus(statusRes.data);
      setHistory(historyRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error("Error loading notification data:", err);
    }
  }, [selectedCompany]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { if (selectedCompany) loadData(); }, [selectedCompany, loadData]);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveSettings = async () => {
    setLoading(p => ({ ...p, save: true }));
    try {
      const params = selectedCompany ? `?company_id=${selectedCompany}` : '';
      await api.put(`/notifications/settings${params}`, settings);
      showMessage("Configuracion guardada correctamente");
      loadData();
      loadCompanies();
    } catch (err) {
      showMessage("Error al guardar: " + (err.response?.data?.detail || err.message), "error");
    }
    setLoading(p => ({ ...p, save: false }));
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setLoading(p => ({ ...p, test: true }));
    try {
      await api.post("/notifications/email/test", { recipient_email: testEmail });
      showMessage(`Email de prueba enviado a ${testEmail}`);
    } catch (err) {
      showMessage("Error: " + (err.response?.data?.detail || err.message), "error");
    }
    setLoading(p => ({ ...p, test: false }));
  };

  const sendManualNotification = async (type) => {
    setLoading(p => ({ ...p, [type]: true }));
    try {
      const params = selectedCompany ? `?company_id=${selectedCompany}` : '';
      const res = await api.post(`/notifications/email/send${params}`, { notification_type: type });
      showMessage(res.data.message || "Notificaciones enviadas");
      loadData();
    } catch (err) {
      showMessage("Error: " + (err.response?.data?.detail || err.message), "error");
    }
    setLoading(p => ({ ...p, [type]: false }));
  };

  const triggerAutoNow = async () => {
    setLoading(p => ({ ...p, auto: true }));
    try {
      const params = selectedCompany ? `?company_id=${selectedCompany}` : '';
      await api.post(`/notifications/send-now${params}`);
      showMessage("Notificaciones ejecutadas para esta empresa");
      loadData();
    } catch (err) {
      showMessage("Error: " + (err.response?.data?.detail || err.message), "error");
    }
    setLoading(p => ({ ...p, auto: false }));
  };

  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.name || "";

  if (!settings) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones por Email</h1>
          <p className="text-muted-foreground">Configura notificaciones por empresa</p>
        </div>
        {alerts && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {alerts.total_alerts} alerta(s) activas
            </span>
          </div>
        )}
      </div>

      {/* Company Selector */}
      <Card data-testid="company-selector-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <Label className="font-semibold text-base">Empresa:</Label>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[300px]" data-testid="company-select">
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyName && (
              <div className="flex gap-3 ml-4">
                {companyOverview.find(o => o.company_id === selectedCompany)?.configured
                  ? <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Configurada</span>
                  : <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Sin configurar</span>
                }
                {companyOverview.find(o => o.company_id === selectedCompany)?.auto_send_enabled && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Auto activado</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.type === "error"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200"
        }`} data-testid="notification-message">
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automatic Notifications Settings */}
        <Card data-testid="auto-notifications-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Notificaciones Automáticas
            </CardTitle>
            <CardDescription>
              Configura el envio automatico para <strong>{selectedCompanyName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">Activar envío automático</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Envía notificaciones diariamente a la hora configurada
                </p>
              </div>
              <Switch
                data-testid="auto-send-toggle"
                checked={settings.auto_send_enabled}
                onCheckedChange={(v) => setSettings(p => ({ ...p, auto_send_enabled: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Hora de envío</Label>
              <Input
                type="time"
                data-testid="send-time-input"
                value={settings.send_time}
                onChange={(e) => setSettings(p => ({ ...p, send_time: e.target.value }))}
                disabled={!settings.auto_send_enabled}
              />
            </div>

            <div className="space-y-3">
              <Label className="font-medium">Tipos de notificación</Label>

              <div className="flex items-center justify-between">
                <span className="text-sm">Mantenimientos pendientes</span>
                <Switch
                  data-testid="maintenance-toggle"
                  checked={settings.maintenance_pending_enabled}
                  onCheckedChange={(v) => setSettings(p => ({ ...p, maintenance_pending_enabled: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Servicios por renovar</span>
                <Switch
                  data-testid="services-toggle"
                  checked={settings.service_renewal_enabled}
                  onCheckedChange={(v) => setSettings(p => ({ ...p, service_renewal_enabled: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Mantenimientos realizados</span>
                <Switch
                  data-testid="completed-toggle"
                  checked={settings.maintenance_completed_enabled !== false}
                  onCheckedChange={(v) => setSettings(p => ({ ...p, maintenance_completed_enabled: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Tickets abiertos</span>
                <Switch
                  data-testid="tickets-toggle"
                  checked={settings.tickets_open_enabled !== false}
                  onCheckedChange={(v) => setSettings(p => ({ ...p, tickets_open_enabled: v }))}
                />
              </div>

              {settings.service_renewal_enabled && (
                <div className="flex items-center gap-3 pl-4">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Días antes del vencimiento:</Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    className="w-20"
                    data-testid="renewal-days-input"
                    value={settings.service_renewal_days}
                    onChange={(e) => setSettings(p => ({ ...p, service_renewal_days: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Destinatarios</Label>
              <Select
                value={settings.recipient_type}
                onValueChange={(v) => setSettings(p => ({ ...p, recipient_type: v }))}
              >
                <SelectTrigger data-testid="recipient-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">Todos los usuarios de esta empresa</SelectItem>
                  <SelectItem value="admins_only">Solo administradores</SelectItem>
                  <SelectItem value="custom">Destinatarios personalizados</SelectItem>
                </SelectContent>
              </Select>

              {settings.recipient_type === "custom" && (
                <CustomRecipients
                  recipients={settings.custom_recipients || []}
                  newRecipient={newRecipient}
                  setNewRecipient={setNewRecipient}
                  onAdd={addRecipient}
                  onRemove={removeRecipient}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={saveSettings}
                disabled={loading.save}
                className="flex-1"
                data-testid="save-settings-btn"
              >
                <Settings className="w-4 h-4 mr-2" />
                {loading.save ? "Guardando..." : "Guardar Configuración"}
              </Button>
              <Button
                variant="outline"
                onClick={triggerAutoNow}
                disabled={loading.auto}
                data-testid="trigger-auto-btn"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading.auto ? "Enviando..." : "Ejecutar ahora"}
              </Button>
            </div>

            {/* Scheduler Status */}
            {schedulerStatus && (
              <div className="text-xs space-y-1 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${schedulerStatus.scheduler_running ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Scheduler: {schedulerStatus.scheduler_running ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${schedulerStatus.job_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>Tarea programada: {schedulerStatus.job_active ? 'Configurada' : 'Sin configurar'}</span>
                </div>
                {schedulerStatus.next_run && (
                  <p className="text-muted-foreground">Próxima ejecución: {schedulerStatus.next_run}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Notifications */}
        <Card data-testid="manual-notifications-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Envío Manual
            </CardTitle>
            <CardDescription>
              Envía notificaciones manualmente cuando lo necesites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Test Email */}
            <div className="space-y-3">
              <SectionHeader icon={Mail} title="Email de Prueba" description="Verifica que la configuración de email funciona" />
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="test-email-input"
                />
                <Button
                  onClick={sendTestEmail}
                  disabled={loading.test || !testEmail}
                  variant="outline"
                  data-testid="send-test-email-btn"
                >
                  {loading.test ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>

            <hr />

            {/* Manual Triggers */}
            <div className="space-y-3">
              <SectionHeader icon={Bell} title="Enviar Notificaciones" description="Envía notificaciones a todos los destinatarios" />

              <div className="space-y-2">
                <Button
                  onClick={() => sendManualNotification("maintenance_pending")}
                  disabled={loading.maintenance_pending}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="send-maintenance-btn"
                >
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                  {loading.maintenance_pending ? "Enviando..." : "Mantenimientos Pendientes"}
                  {alerts?.pending_maintenance?.length > 0 && (
                    <span className="ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      {alerts.pending_maintenance.length}
                    </span>
                  )}
                </Button>

                <Button
                  onClick={() => sendManualNotification("service_renewal")}
                  disabled={loading.service_renewal}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="send-services-btn"
                >
                  <Clock className="w-4 h-4 mr-2 text-blue-500" />
                  {loading.service_renewal ? "Enviando..." : "Servicios por Renovar"}
                  {alerts?.expiring_services?.length > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {alerts.expiring_services.length}
                    </span>
                  )}
                </Button>

                <Button
                  onClick={() => sendManualNotification("maintenance_completed")}
                  disabled={loading.maintenance_completed}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="send-completed-btn"
                >
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  {loading.maintenance_completed ? "Enviando..." : "Mantenimientos Realizados"}
                  {alerts?.completed_maintenance > 0 && (
                    <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      {alerts.completed_maintenance}
                    </span>
                  )}
                </Button>

                <Button
                  onClick={() => sendManualNotification("tickets_open")}
                  disabled={loading.tickets_open}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="send-tickets-btn"
                >
                  <Ticket className="w-4 h-4 mr-2 text-rose-500" />
                  {loading.tickets_open ? "Enviando..." : "Tickets Abiertos"}
                  {alerts?.open_tickets > 0 && (
                    <span className="ml-auto bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                      {alerts.open_tickets}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification History */}
      <Card data-testid="notification-history-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Envíos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay registros de envíos anteriores
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${item.type === 'automatic' ? 'bg-blue-100' : 'bg-green-100'}`}>
                      {item.type === "automatic"
                        ? <Clock className="w-3.5 h-3.5 text-blue-600" />
                        : <Send className="w-3.5 h-3.5 text-green-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {item.type === "automatic" ? "Envío automático" : "Envío manual"}
                        {item.notification_type && ` - ${
                          item.notification_type === 'maintenance_pending' ? 'Mant. Pendientes' :
                          item.notification_type === 'maintenance_completed' ? 'Mant. Realizados' :
                          'Servicios'
                        }`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.sent_at).toLocaleString("es-MX")}
                        {item.triggered_by && ` por ${item.triggered_by}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{item.total_sent || 0} enviado(s)</span>
                    {item.total_failed > 0 && (
                      <span className="text-xs text-red-500">({item.total_failed} fallido(s))</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
