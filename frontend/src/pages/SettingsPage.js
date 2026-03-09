import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Settings, Image, Save, Loader2, Building2, Palette, LogIn, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: '',
    logo_url: '',
    primary_color: '#3b82f6',
    login_background_url: '',
    login_title: '',
    login_subtitle: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettings({
          company_name: res.data.company_name || '',
          logo_url: res.data.logo_url || '',
          primary_color: res.data.primary_color || '#3b82f6',
          login_background_url: res.data.login_background_url || '',
          login_title: res.data.login_title || '',
          login_subtitle: res.data.login_subtitle || ''
        });
      }
    } catch (error) {
      console.log('No settings found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      localStorage.setItem('app_settings', JSON.stringify(settings));
      toast.success('Configuración guardada correctamente');
      window.location.reload();
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="text-muted-foreground">Personaliza la apariencia de tu sistema</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="login">
            <LogIn className="w-4 h-4 mr-2" />
            Inicio de Sesión
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="w-4 h-4 mr-2" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Información de la Empresa
              </CardTitle>
              <CardDescription>
                Configura el nombre y logo de tu empresa para mostrar en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                  placeholder="Mi Empresa S.A. de C.V."
                  data-testid="company-name-input"
                />
                <p className="text-xs text-muted-foreground">
                  Este nombre aparecerá en el encabezado y en los reportes PDF
                </p>
              </div>

              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logo_url" className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  URL del Logo Principal
                </Label>
                <Input
                  id="logo_url"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                  placeholder="https://tu-sitio.com/logo.png"
                  data-testid="logo-url-input"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa la URL de tu logo (formato PNG o JPG, recomendado máximo 200x80 px)
                </p>
                
                {/* Logo Preview */}
                {settings.logo_url && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">Vista previa:</p>
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-4 rounded border">
                        <img 
                          src={settings.logo_url} 
                          alt="Logo preview" 
                          className="max-h-16 max-w-48 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            toast.error('No se pudo cargar la imagen');
                          }}
                        />
                      </div>
                      <div className="bg-slate-800 p-4 rounded">
                        <img 
                          src={settings.logo_url} 
                          alt="Logo preview dark" 
                          className="max-h-16 max-w-48 object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Page Settings */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Página de Inicio de Sesión
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia de la página de login
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Login Background */}
              <div className="space-y-2">
                <Label htmlFor="login_bg" className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Imagen de Fondo
                </Label>
                <Input
                  id="login_bg"
                  value={settings.login_background_url}
                  onChange={(e) => setSettings({...settings, login_background_url: e.target.value})}
                  placeholder="https://tu-sitio.com/fondo-login.jpg"
                  data-testid="login-bg-input"
                />
                <p className="text-xs text-muted-foreground">
                  Imagen de fondo para el lado izquierdo de la página de login (recomendado 1920x1080)
                </p>
                
                {settings.login_background_url && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">Vista previa del fondo:</p>
                    <img 
                      src={settings.login_background_url} 
                      alt="Login background preview" 
                      className="max-h-40 w-full object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        toast.error('No se pudo cargar la imagen');
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Login Title */}
              <div className="space-y-2">
                <Label htmlFor="login_title">Título de Bienvenida</Label>
                <Input
                  id="login_title"
                  value={settings.login_title}
                  onChange={(e) => setSettings({...settings, login_title: e.target.value})}
                  placeholder="Gestión inteligente de activos tecnológicos"
                  data-testid="login-title-input"
                />
                <p className="text-xs text-muted-foreground">
                  Título principal que aparece en la página de login
                </p>
              </div>

              {/* Login Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="login_subtitle">Subtítulo</Label>
                <Input
                  id="login_subtitle"
                  value={settings.login_subtitle}
                  onChange={(e) => setSettings({...settings, login_subtitle: e.target.value})}
                  placeholder="Control completo de equipos, asignaciones y más"
                  data-testid="login-subtitle-input"
                />
                <p className="text-xs text-muted-foreground">
                  Descripción breve debajo del título
                </p>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium mb-4">Vista previa de la página de login:</p>
                <div className="flex rounded-lg overflow-hidden border shadow-sm" style={{height: '200px'}}>
                  {/* Left side preview */}
                  <div 
                    className="w-1/2 bg-slate-900 relative flex items-end p-4"
                    style={{
                      backgroundImage: settings.login_background_url ? `url(${settings.login_background_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                    <div className="relative z-10 text-white">
                      <div className="flex items-center gap-2 mb-2">
                        {settings.logo_url ? (
                          <img src={settings.logo_url} alt="Logo" className="h-6 max-w-20 object-contain" />
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                              <Monitor className="w-3 h-3" />
                            </div>
                            <span className="text-sm font-bold">{settings.company_name || 'InventarioTI'}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs font-semibold">
                        {settings.login_title || 'Gestión inteligente de activos tecnológicos'}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {settings.login_subtitle || 'Control completo de equipos, asignaciones y más'}
                      </p>
                    </div>
                  </div>
                  {/* Right side preview */}
                  <div className="w-1/2 bg-background flex items-center justify-center p-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold">Iniciar sesión</p>
                      <div className="mt-2 space-y-1">
                        <div className="h-2 w-32 bg-muted rounded" />
                        <div className="h-2 w-32 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Settings */}
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Colores y Apariencia
              </CardTitle>
              <CardDescription>
                Personaliza los colores del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Color Principal</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                    className="w-16 h-10 p-1 cursor-pointer"
                    data-testid="primary-color-input"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                    className="flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Este color se usará para botones y elementos destacados
                </p>
              </div>

              {/* Color presets */}
              <div className="space-y-2">
                <Label>Colores predefinidos</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Azul', color: '#3b82f6' },
                    { name: 'Verde', color: '#22c55e' },
                    { name: 'Morado', color: '#8b5cf6' },
                    { name: 'Rojo', color: '#ef4444' },
                    { name: 'Naranja', color: '#f97316' },
                    { name: 'Rosa', color: '#ec4899' },
                    { name: 'Cyan', color: '#06b6d4' },
                    { name: 'Índigo', color: '#6366f1' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setSettings({...settings, primary_color: preset.color})}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        settings.primary_color === preset.color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg" data-testid="save-settings-btn">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
