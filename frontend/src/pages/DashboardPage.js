import { useState, useEffect } from 'react';
import { dashboardAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Monitor, Users, Building2, Wrench, FileText, Receipt,
  TrendingUp, Package, AlertCircle, Clock, BarChart3, Timer, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const STATUS_COLORS = {
  'Disponible': '#10b981',
  'Asignado': '#3b82f6',
  'En Mantenimiento': '#f59e0b',
  'De Baja': '#ef4444',
};

const MAINT_COLORS = {
  'Preventivo': '#3b82f6',
  'Correctivo': '#f59e0b',
  'Reparacion': '#ef4444',
  'Otro': '#94a3b8',
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

const MAINT_STATUS_COLORS = {
  'Pendiente': '#eab308',
  'En Proceso': '#3b82f6',
  'Finalizado': '#10b981',
};

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ==================== KPI CARDS ====================

function KpiCards({ stats }) {
  const equipment = stats?.equipment || {};
  return (
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
  );
}

// ==================== SECONDARY STATS ====================

function SecondaryStats({ stats, advancedStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <Card className="stat-card" data-testid="kpi-avg-resolution">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="kpi-icon bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prom. Resolucion</p>
              <p className="text-2xl font-bold">{advancedStats?.avg_resolution_hours || 0}h</p>
              <p className="text-xs text-muted-foreground">{advancedStats?.total_completed || 0} completados</p>
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
              <p className="text-sm text-muted-foreground">Cotizaciones Pend.</p>
              <p className="text-2xl font-bold">{stats?.pending_quotations || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stat-card" data-testid="kpi-expiring-services">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`kpi-icon ${(advancedStats?.expiring_services_30d || 0) > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Servicios por Vencer</p>
              <p className="text-2xl font-bold">{advancedStats?.expiring_services_30d || 0}</p>
              <p className="text-xs text-muted-foreground">proximos 30 dias</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MAINTENANCE BY MONTH CHART ====================

function MaintenanceByMonthChart({ data }) {
  const chartData = (data || []).map(d => ({ ...d, month: formatMonth(d.month) }));

  if (chartData.length === 0) {
    return (
      <Card data-testid="chart-maintenance-by-month">
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Mantenimientos por Mes</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="text-center"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin datos de mantenimiento</p></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-maintenance-by-month">
      <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Mantenimientos por Mes</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Preventivo" fill={MAINT_COLORS.Preventivo} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Correctivo" fill={MAINT_COLORS.Correctivo} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Reparacion" name="Reparacion" fill={MAINT_COLORS.Reparacion} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ==================== EQUIPMENT STATUS PIE ====================

function EquipmentStatusPie({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card data-testid="chart-equipment-status">
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Estado de Equipos</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="text-center"><Monitor className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin equipos registrados</p></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card data-testid="chart-equipment-status">
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Estado de Equipos</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={240}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} strokeWidth={0}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${Math.round(value / total * 100)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm">{item.status}</span>
                </div>
                <span className="text-sm font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAINTENANCE STATUS PIE ====================

function MaintenanceStatusPie({ data }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card data-testid="chart-maintenance-status">
      <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" />Estado de Mantenimientos</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width="50%" height={200}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2} strokeWidth={0}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={MAINT_STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${Math.round(value / total * 100)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MAINT_STATUS_COLORS[item.status] || PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm">{item.status}</span>
                </div>
                <span className="text-sm font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== EQUIPMENT BY MONTH AREA ====================

function EquipmentByMonthChart({ data }) {
  const chartData = (data || []).map(d => ({ ...d, month: formatMonth(d.month) }));
  if (chartData.length === 0) return null;

  return (
    <Card data-testid="chart-equipment-by-month">
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Equipos Registrados por Mes</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" name="Equipos" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ==================== TOP EQUIPMENT TABLE ====================

function TopEquipmentIncidents({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <Card data-testid="top-equipment-incidents">
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" />Equipos con Mas Incidencias</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : i === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.code}</p>
                <p className="text-xs text-muted-foreground">{item.type} - {item.brand_model}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">mantenimientos</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== RECENT ACTIVITY ====================

function RecentActivity({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Actividad Reciente</CardTitle></CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay actividad reciente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getLogStyle = (logType) => {
    switch (logType) {
      case 'Mantenimiento': return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
      case 'Incidencia': return { dot: 'bg-red-500', badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
      case 'Cambio': return { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
      default: return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Actividad Reciente</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log, index) => {
            const style = getLogStyle(log.log_type);
            return (
              <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Equipo: {log.equipment_code}</span>
                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('es')}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${style.badge}`}>{log.log_type}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN DASHBOARD ====================

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, advRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getAdvancedStats()
      ]);
      setStats(statsRes.data);
      setAdvancedStats(advRes.data);
    } catch {
      toast.error('Error al cargar estadisticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general del inventario</p>
      </div>

      <KpiCards stats={stats} />
      <SecondaryStats stats={stats} advancedStats={advancedStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceByMonthChart data={advancedStats?.maintenance_by_month} />
        <EquipmentStatusPie data={advancedStats?.equipment_by_status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceStatusPie data={advancedStats?.maintenance_by_status} />
        <TopEquipmentIncidents data={advancedStats?.top_equipment_incidents} />
      </div>

      <EquipmentByMonthChart data={advancedStats?.equipment_by_month} />

      <RecentActivity logs={stats?.recent_activity} />
    </div>
  );
}
