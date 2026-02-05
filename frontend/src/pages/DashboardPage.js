import { useState, useEffect } from 'react';
import { dashboardAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Monitor, Users, Building2, Wrench, FileText, Receipt, 
  TrendingUp, Package, AlertCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const equipment = stats?.equipment || {};
  const recentActivity = stats?.recent_activity || [];
  const equipmentByType = stats?.equipment_by_type || [];

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general del inventario</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card" data-testid="kpi-total-equipment">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Equipos</p>
                <p className="text-3xl font-bold mt-1">{equipment.total || 0}</p>
              </div>
              <div className="kpi-icon bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Monitor className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="kpi-available-equipment">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disponibles</p>
                <p className="text-3xl font-bold mt-1 text-emerald-600">{equipment.available || 0}</p>
              </div>
              <div className="kpi-icon bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="kpi-assigned-equipment">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asignados</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{equipment.assigned || 0}</p>
              </div>
              <div className="kpi-icon bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="kpi-in-maintenance">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Mantenimiento</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">{stats?.pending_maintenance || 0}</p>
              </div>
              <div className="kpi-icon bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="kpi-icon bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Empresas</p>
                <p className="text-2xl font-bold">{stats?.companies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="kpi-icon bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cotizaciones Pendientes</p>
                <p className="text-2xl font-bold">{stats?.pending_quotations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="kpi-icon bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
                <p className="text-2xl font-bold">{stats?.pending_invoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Estado de Equipos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <span className="text-sm font-medium">Disponibles</span>
                <span className="text-xl font-bold text-emerald-600">{equipment.available || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <span className="text-sm font-medium">Asignados</span>
                <span className="text-xl font-bold text-blue-600">{equipment.assigned || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <span className="text-sm font-medium">En Mantenimiento</span>
                <span className="text-xl font-bold text-amber-600">{equipment.in_maintenance || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <span className="text-sm font-medium">De Baja</span>
                <span className="text-xl font-bold text-red-600">{equipment.decommissioned || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Equipos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentByType.length > 0 ? (
              <div className="space-y-3">
                {equipmentByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">{item.type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((item.count / (equipment.total || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay tipos de equipo registrados</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((log, index) => {
                const logTypeClass = log.log_type === 'Mantenimiento' ? 'bg-amber-500' :
                  log.log_type === 'Incidencia' ? 'bg-red-500' :
                  log.log_type === 'Cambio' ? 'bg-blue-500' : 'bg-emerald-500';
                
                const badgeClass = log.log_type === 'Mantenimiento' 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                  : log.log_type === 'Incidencia' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : log.log_type === 'Cambio'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
                
                return (
                  <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 ${logTypeClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Equipo: {log.equipment_code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('es')}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
                      {log.log_type}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay actividad reciente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
