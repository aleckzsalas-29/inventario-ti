import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  Settings, Image, Save, Loader2, Building2, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: '',
    logo_url: '',
    primary_color: '#3b82f6'
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
          primary_color: res.data.primary_color || '#3b82f6'
        });
      }
    } catch (error) {
      // Settings might not exist yet, that's ok
      console.log('No settings found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      // Save to localStorage for immediate use
      localStorage.setItem('app_settings', JSON.stringify(settings));
      toast.success('Configuración guardada correctamente');
      // Reload to apply changes
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

      {/* Branding Settings */}
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
              URL del Logo
            </Label>
            <Input
              id="logo_url"
              value={settings.logo_url}
              onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
              placeholder="https://tu-sitio.com/logo.png"
              data-testid="logo-url-input"
            />
            <p className="text-xs text-muted-foreground">
              Ingresa la URL de tu logo (formato PNG o JPG recomendado, máximo 200x80 px)
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

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Apariencia
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
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} data-testid="save-settings-btn">
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
