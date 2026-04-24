import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { 
  LayoutDashboard, Monitor, Building2, Users, UserCheck, Wrench, 
  Server, FileText, Receipt, LogOut, Menu, X,
  Sun, Moon, Bell, ChevronDown, Search, SlidersHorizontal, FileDown, Settings,
  AlertCircle, CheckCircle, Info, Clock, Mail, Ticket
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: null },
  { icon: Monitor, label: 'Equipos', path: '/equipment', roles: null },
  { icon: Building2, label: 'Empresas', path: '/companies', roles: null },
  { icon: Users, label: 'Empleados', path: '/employees', roles: null },
  { icon: UserCheck, label: 'Asignaciones', path: '/assignments', roles: null },
  { icon: Wrench, label: 'Mantenimientos', path: '/maintenance', roles: null },
  { icon: Ticket, label: 'Tickets Soporte', path: '/tickets', roles: null },
  { icon: Server, label: 'Servicios Externos', path: '/services', roles: null },
  { icon: FileText, label: 'Cotizaciones', path: '/quotations', roles: null },
  { icon: Receipt, label: 'Facturas', path: '/invoices', roles: null },
  { icon: FileDown, label: 'Reportes', path: '/reports', roles: null },
  { icon: Mail, label: 'Notificaciones Email', path: '/notifications', roles: null },
  { icon: Users, label: 'Usuarios', path: '/users', roles: null },
  { icon: SlidersHorizontal, label: 'Campos Personalizados', path: '/custom-fields', roles: null },
  { icon: Settings, label: 'Configuración', path: '/settings', roles: null },
];

const solicitanteNavItems = [
  { icon: Ticket, label: 'Mis Tickets', path: '/tickets', roles: ['Solicitante'] },
];

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({ company_name: '', logo_url: '' });
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    // Load settings from localStorage first for instant display
    const cached = localStorage.getItem('app_settings');
    if (cached) {
      try {
        setAppSettings(JSON.parse(cached));
      } catch (e) {}
    }
    // Then fetch from API
    api.get('/settings').then(res => {
      if (res.data) {
        setAppSettings(res.data);
        localStorage.setItem('app_settings', JSON.stringify(res.data));
      }
    }).catch(() => {});

    // Load notifications
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Get services expiring soon
      const servicesRes = await api.get('/external-services');
      const services = servicesRes.data || [];
      
      const today = new Date();
      const notifs = [];

      // Check for services expiring in 30 days
      services.forEach(svc => {
        if (svc.renewal_date) {
          const renewalDate = new Date(svc.renewal_date);
          const daysUntil = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 30 && daysUntil >= 0) {
            notifs.push({
              id: svc.id,
              type: daysUntil <= 7 ? 'warning' : 'info',
              title: `Servicio por renovar`,
              message: `${svc.provider} (${svc.service_type}) vence en ${daysUntil} días`,
              date: svc.renewal_date
            });
          }
        }
      });

      // Get maintenance logs pending
      const maintRes = await api.get('/maintenance-logs');
      const maintenances = maintRes.data || [];
      
      const pendingMaint = maintenances.filter(m => m.status === 'Pendiente' || m.status === 'En Proceso');
      if (pendingMaint.length > 0) {
        notifs.push({
          id: 'maint-pending',
          type: 'info',
          title: 'Mantenimientos pendientes',
          message: `Tienes ${pendingMaint.length} mantenimiento(s) sin finalizar`,
          date: new Date().toISOString()
        });
      }

      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="main-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <Link to="/" className="flex items-center gap-3">
              {appSettings.logo_url ? (
                <img 
                  src={appSettings.logo_url} 
                  alt="Logo" 
                  className="h-9 max-w-[140px] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center ${appSettings.logo_url ? 'hidden' : ''}`}>
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">{appSettings.company_name || 'InventarioTI'}</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {(user?.role_name === 'Solicitante' ? solicitanteNavItems : navItems).map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "sidebar-link",
                    isActive && "active"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role_name}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 glass flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 w-64">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="bg-transparent border-none outline-none text-sm flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="font-semibold">Notificaciones</h4>
                  <p className="text-xs text-muted-foreground">
                    {notifications.length > 0 ? `${notifications.length} alertas` : 'Sin alertas nuevas'}
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">¡Todo en orden!</p>
                      <p className="text-xs">No hay alertas pendientes</p>
                    </div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div 
                        key={notif.id || idx} 
                        className="p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (notif.id === 'maint-pending') {
                            navigate('/maintenance');
                          } else {
                            navigate('/services');
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(notif.date).toLocaleDateString('es')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => {
                        setNotifications([]);
                        setNotificationsOpen(false);
                      }}
                    >
                      Marcar todas como leídas
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="user-menu-btn">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden md:inline text-sm">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
