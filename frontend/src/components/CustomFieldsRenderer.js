import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Eye, EyeOff, Settings } from 'lucide-react';
import api from '../lib/api';

export default function CustomFieldsRenderer({ 
  entityType, 
  values = {}, 
  onChange,
  showTitle = true 
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    fetchFields();
  }, [entityType]);

  const fetchFields = async () => {
    try {
      const response = await api.get('/custom-fields', { params: { entity_type: entityType } });
      setFields(response.data.filter(f => f.is_active));
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fieldName, value) => {
    onChange({
      ...values,
      [fieldName]: value
    });
  };

  const togglePassword = (fieldName) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Group fields by category
  const groupedFields = fields.reduce((acc, field) => {
    const category = field.category || 'Campos Adicionales';
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {});

  if (loading) return null;
  if (fields.length === 0) return null;

  const renderField = (field) => {
    const value = values[field.name] ?? '';
    const fieldKey = `custom-${field.name}`;

    switch (field.field_type) {
      case 'text':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={`Ingrese ${field.name.toLowerCase()}`}
              required={field.required}
            />
          </div>
        );

      case 'number':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder="0"
              required={field.required}
            />
          </div>
        );

      case 'date':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select 
              value={value || "placeholder"} 
              onValueChange={(v) => handleChange(field.name, v === "placeholder" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Seleccionar...</SelectItem>
                {field.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldKey} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label className="cursor-pointer">
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
          </div>
        );

      case 'password':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label>
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                type={showPasswords[field.name] ? "text" : "password"}
                value={value}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder="••••••••"
                required={field.required}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => togglePassword(field.name)}
              >
                {showPasswords[field.name] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedFields).map(([category, categoryFields]) => (
        <Card key={category} className="border-dashed">
          {showTitle && (
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className={showTitle ? "" : "pt-4"}>
            <div className="grid grid-cols-2 gap-4">
              {categoryFields.map(renderField)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Hook for loading custom fields
export function useCustomFields(entityType) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await api.get('/custom-fields', { params: { entity_type: entityType } });
        setFields(response.data.filter(f => f.is_active));
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [entityType]);

  return { fields, loading };
}

// Component to display custom field values (read-only)
export function CustomFieldsDisplay({ entityType, values = {} }) {
  const { fields, loading } = useCustomFields(entityType);
  const [showPasswords, setShowPasswords] = useState({});

  if (loading || fields.length === 0 || !values || Object.keys(values).length === 0) {
    return null;
  }

  const togglePassword = (name) => {
    setShowPasswords(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const groupedFields = fields.reduce((acc, field) => {
    const category = field.category || 'Campos Adicionales';
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Campos Personalizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedFields).map(([category, categoryFields]) => (
          <div key={category}>
            {Object.keys(groupedFields).length > 1 && (
              <p className="text-xs text-muted-foreground mb-2">{category}</p>
            )}
            <div className="space-y-2">
              {categoryFields.map(field => {
                const value = values[field.name];
                if (value === undefined || value === null || value === '') return null;

                let displayValue = value;
                if (field.field_type === 'boolean') {
                  displayValue = value ? 'Sí' : 'No';
                } else if (field.field_type === 'password') {
                  displayValue = showPasswords[field.name] ? value : '••••••••';
                }

                return (
                  <div key={field.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm text-muted-foreground">{field.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{displayValue}</span>
                      {field.field_type === 'password' && (
                        <button
                          onClick={() => togglePassword(field.name)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
