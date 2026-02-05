import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Eye, EyeOff, Settings, AlertCircle } from 'lucide-react';
import api from '../lib/api';

// Validation helper functions
const validateField = (value, field) => {
  const validation = field.validation;
  if (!validation) return null;
  
  const strValue = String(value || '');
  
  // Text validations
  if (field.field_type === 'text' || field.field_type === 'password') {
    if (validation.min_length && strValue.length < validation.min_length) {
      return `Mínimo ${validation.min_length} caracteres`;
    }
    if (validation.max_length && strValue.length > validation.max_length) {
      return `Máximo ${validation.max_length} caracteres`;
    }
    if (validation.regex_pattern && strValue) {
      try {
        const regex = new RegExp(validation.regex_pattern);
        if (!regex.test(strValue)) {
          return validation.regex_message || 'Formato inválido';
        }
      } catch (e) {
        console.error('Invalid regex:', e);
      }
    }
  }
  
  // Number validations
  if (field.field_type === 'number' && value !== '' && value !== null) {
    const numValue = parseFloat(value);
    if (validation.min_value !== null && validation.min_value !== undefined && numValue < validation.min_value) {
      return `Valor mínimo: ${validation.min_value}`;
    }
    if (validation.max_value !== null && validation.max_value !== undefined && numValue > validation.max_value) {
      return `Valor máximo: ${validation.max_value}`;
    }
  }
  
  // Date validations
  if (field.field_type === 'date' && value) {
    if (validation.min_date && value < validation.min_date) {
      return `Fecha mínima: ${validation.min_date}`;
    }
    if (validation.max_date && value > validation.max_date) {
      return `Fecha máxima: ${validation.max_date}`;
    }
  }
  
  return null;
};

export default function CustomFieldsRenderer({ 
  entityType, 
  values = {}, 
  onChange,
  showTitle = true,
  onValidationChange
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});
  const [errors, setErrors] = useState({});

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

  const handleChange = (fieldName, value, field) => {
    // Validate the field
    const error = validateField(value, field);
    const newErrors = { ...errors };
    
    if (error) {
      newErrors[fieldName] = error;
    } else {
      delete newErrors[fieldName];
    }
    
    setErrors(newErrors);
    
    // Notify parent about validation state
    if (onValidationChange) {
      onValidationChange(Object.keys(newErrors).length === 0);
    }
    
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
    const error = errors[field.name];
    const hasValidation = field.validation && Object.keys(field.validation).some(k => field.validation[k] !== null);

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
              onChange={(e) => handleChange(field.name, e.target.value, field)}
              placeholder={field.placeholder || `Ingrese ${field.name.toLowerCase()}`}
              required={field.required}
              className={error ? 'border-red-500' : ''}
              maxLength={field.validation?.max_length || undefined}
            />
            {field.help_text && !error && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
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
              onChange={(e) => handleChange(field.name, e.target.value, field)}
              placeholder={field.placeholder || "0"}
              required={field.required}
              className={error ? 'border-red-500' : ''}
              min={field.validation?.min_value ?? undefined}
              max={field.validation?.max_value ?? undefined}
            />
            {field.help_text && !error && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
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
              onChange={(e) => handleChange(field.name, e.target.value, field)}
              required={field.required}
              className={error ? 'border-red-500' : ''}
              min={field.validation?.min_date || undefined}
              max={field.validation?.max_date || undefined}
            />
            {field.help_text && !error && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
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
              onValueChange={(v) => handleChange(field.name, v === "placeholder" ? "" : v, field)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Seleccionar...</SelectItem>
                {field.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldKey} className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <Label className="cursor-pointer">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Switch
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => handleChange(field.name, checked, field)}
              />
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
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
                onChange={(e) => handleChange(field.name, e.target.value, field)}
                placeholder={field.placeholder || "••••••••"}
                required={field.required}
                className={error ? 'border-red-500 pr-10' : 'pr-10'}
                maxLength={field.validation?.max_length || undefined}
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
            {field.help_text && !error && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
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
