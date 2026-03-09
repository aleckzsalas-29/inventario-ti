import { useState, useEffect } from 'react';
import { companiesAPI, reportsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { 
  Download, FileText, Wrench, Server, Monitor, Calendar,
  Building2, Loader2, FileDown
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    loadCompanies();
    // Set default dates
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(monthAgo.toISOString().split('T')[0]);
  }, []);

  const loadCompanies = async () => {
    try {
      const res = await companiesAPI.getAll();
      setCompanies(res.data);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const setPeriodDates = (periodType) => {
    const today = new Date();
    let fromDate = new Date();
    
    switch(periodType) {
      case 'day':
        fromDate.setDate(today.getDate() - 1);
        break;
      case 'week':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        fromDate.setMonth(today.getMonth() - 1);
    }
    
    setPeriod(periodType);
    setDateFrom(fromDate.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const downloadReport = async (reportType) => {
    setDownloading(reportType);
    try {
      let response;
      const companyId = selectedCompany !== 'all' ? selectedCompany : null;
      
      switch(reportType) {
        case 'equipment':
          response = await reportsAPI.equipmentPdf({ 
            company_id: companyId,
            date_from: dateFrom,
            date_to: dateTo
          });
          break;
        case 'maintenance':
          response = await reportsAPI.maintenancePdf({ 
            company_id: companyId,
            period: period,
            date_from: dateFrom,
            date_to: dateTo
          });
          break;
        case 'equipment-status':
          response = await reportsAPI.equipmentStatusPdf(companyId);
          break;
        case 'external-services':
          response = await reportsAPI.externalServicesPdf(companyId);
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Error al descargar el reporte');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'equipment',
      title: 'Inventario de Equipos',
      description: 'Lista completa de equipos con especificaciones técnicas, estado y asignaciones',
      icon: Monitor,
      color: 'bg-blue-500'
    },
    {
      id: 'equipment-status',
      title: 'Estado de Equipos por Empresa',
      description: 'Resumen del estado de los equipos agrupados por empresa',
      icon: Building2,
      color: 'bg-indigo-500'
    },
    {
      id: 'maintenance',
      title: 'Bitácoras de Mantenimiento',
      description: 'Historial de mantenimientos preventivos, correctivos y reparaciones',
      icon: Wrench,
      color: 'bg-orange-500'
    },
    {
      id: 'external-services',
      title: 'Servicios Externos',
      description: 'Listado de servicios contratados con fechas de renovación y costos',
      icon: Server,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Centro de Reportes</h1>
          <p className="text-muted-foreground">Genera y descarga reportes en PDF de tu inventario</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtros de Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Company Filter */}
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger data-testid="company-filter">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Presets */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriodDates}>
                <SelectTrigger data-testid="period-filter">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Último día</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="year">Último año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPeriod('custom');
                }}
                data-testid="date-from"
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPeriod('custom');
                }}
                data-testid="date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;
          
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <Button
                    onClick={() => downloadReport(report.id)}
                    disabled={isDownloading}
                    data-testid={`download-${report.id}-btn`}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Descargar PDF
                  </Button>
                </div>
                <CardTitle className="mt-4">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileDown className="w-4 h-4" />
                  <span>Formato: PDF</span>
                  <span className="mx-2">|</span>
                  <Calendar className="w-4 h-4" />
                  <span>{dateFrom} a {dateTo}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Descargar Todos los Reportes</CardTitle>
          <CardDescription>
            Genera todos los reportes disponibles con los filtros actuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={async () => {
              for (const report of reports) {
                await downloadReport(report.id);
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }}
            disabled={downloading !== null}
            data-testid="download-all-btn"
          >
            <FileText className="w-4 h-4 mr-2" />
            Descargar Todos los Reportes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
