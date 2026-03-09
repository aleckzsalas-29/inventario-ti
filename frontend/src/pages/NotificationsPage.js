import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  Mail, Send, Loader2, CheckCircle, AlertCircle, Server, Wrench, Monitor, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [stats, setStats] = useState({ services_expiring_soon: 0, maintenances_pending: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/notifications/email/check');
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Ingresa un email de prueba');
      return;
    }
    setSending('test');
    try {
      await api.post('/notifications/email/test', { recipient_email: testEmail });
      toast.success(`Email de prueba enviado a ${testEmail}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar email de prueba');
    } finally {
      setSending(null);
    }
  };

  const sendNotification = async (type) => {
    setSending(type);
    try {
      const res = await api.post('/notifications/email/send', { notification_type: type });
      toast.success(res.data.message);
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al enviar notificaciones');
    } finally {
      setSending(null);
    }
  };

  const notificationTypes = [
    {
      id: 'service_renewal',
      title: 'Servicios por Renovar',
      description: 'Envía un email con los servicios que vencen en los próximos 30 días',
      icon: Server,
      color: 'bg-orange-500',
      count: stats.services_expiring_soon
    },
    {
      id: 'maintenance_pending',
      title: 'Mantenimientos Pendientes',
      description: 'Envía un email con los mantenimientos sin finalizar',
      icon: Wrench,
      color: 'bg-blue-500',
      count: stats.maintenances_pending
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificaciones por Email</h1>
          <p className="text-muted-foreground">Configura y envía notificaciones por correo electrónico</p>
        </div>
      </div>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Probar Configuración
          </CardTitle>
          <CardDescription>
            Envía un email de prueba para verificar que las notificaciones funcionan correctamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="test-email" className="sr-only">Email de prueba</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                data-testid="test-email-input"
              />
            </div>
            <Button 
              onClick={sendTestEmail} 
              disabled={sending === 'test'}
              data-testid="send-test-btn"
            >
              {sending === 'test' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Prueba
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notificationTypes.map((notif) => {
          const Icon = notif.icon;
          const isSending = sending === notif.id;
          
          return (
            <Card key={notif.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${notif.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {notif.count > 0 && (
                    <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-full">
                      {notif.count} pendiente{notif.count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4">{notif.title}</CardTitle>
                <CardDescription>{notif.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => sendNotification(notif.id)}
                  disabled={isSending || notif.count === 0}
                  className="w-full"
                  variant={notif.count > 0 ? "default" : "outline"}
                  data-testid={`send-${notif.id}-btn`}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {notif.count > 0 ? 'Enviar Notificación' : 'Sin pendientes'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium">Configuración de Emails</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Las notificaciones se envían a todos los usuarios activos del sistema.
                Para agregar o modificar destinatarios, ve a la sección de Usuarios o Empresas.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Nota:</strong> En modo de prueba de Resend, los emails solo se envían a direcciones verificadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
