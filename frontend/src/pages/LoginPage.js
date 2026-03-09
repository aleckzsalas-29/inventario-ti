import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Monitor, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState({ company_name: '', logo_url: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load settings
    const cached = localStorage.getItem('app_settings');
    if (cached) {
      try {
        setAppSettings(JSON.parse(cached));
      } catch (e) {}
    }
    api.get('/settings').then(res => {
      if (res.data) {
        setAppSettings(res.data);
        localStorage.setItem('app_settings', JSON.stringify(res.data));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor ingrese email y contraseña');
      return;
    }
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bienvenido al sistema');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const companyName = appSettings.company_name || 'InventarioTI';

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1744868562210-fffb7fa882d9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxzZXJ2ZXIlMjByb29tJTIwZGF0YWNlbnRlciUyMHRlY2hub2xvZ3l8ZW58MHx8fHwxNzcwMjYwMzg2fDA&ixlib=rb-4.1.0&q=85"
            alt="Server room"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="flex items-center gap-3 mb-6">
            {appSettings.logo_url ? (
              <img 
                src={appSettings.logo_url} 
                alt="Logo" 
                className="h-12 max-w-[180px] object-contain"
              />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight">{companyName}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Gestión inteligente de<br />activos tecnológicos
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Control completo de equipos, asignaciones, servicios externos, cotizaciones y facturación en una sola plataforma.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            {appSettings.logo_url ? (
              <img 
                src={appSettings.logo_url} 
                alt="Logo" 
                className="h-10 max-w-[150px] object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">{companyName}</span>
              </>
            )}
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
              <CardDescription>
                Ingrese sus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="login-email-input"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="login-password-input"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
