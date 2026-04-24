import { useState, useEffect } from 'react';
import { ticketsAPI, equipmentAPI, usersAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import {
  Plus, Search, Loader2, X, Ticket, MessageSquare, Clock, AlertCircle,
  CheckCircle, CircleDot, Send, User, Monitor, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const PRIORITIES = [
  { value: 'Baja', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'Media', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'Alta', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'Critica', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const STATUSES = [
  { value: 'Abierto', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  { value: 'En Proceso', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CircleDot },
  { value: 'Resuelto', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  { value: 'Cerrado', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: X },
];

const CATEGORIES = ['General', 'Hardware', 'Software', 'Red', 'Accesos', 'Email', 'Impresora', 'Otro'];

const getPriorityColor = (p) => PRIORITIES.find(x => x.value === p)?.color || 'bg-gray-100 text-gray-700';
const getStatusInfo = (s) => STATUSES.find(x => x.value === s) || STATUSES[0];

// ==================== STATS BAR ====================

function TicketStats({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Abiertos', value: stats.open, color: 'text-red-600' },
    { label: 'En Proceso', value: stats.in_progress, color: 'text-blue-600' },
    { label: 'Resueltos', value: stats.resolved, color: 'text-emerald-600' },
    { label: 'Cerrados', value: stats.closed, color: 'text-gray-500' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(item => (
        <Card key={item.label} className="stat-card">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value || 0}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==================== TICKET DETAIL DIALOG ====================

function TicketDetail({ ticket, onClose, onUpdate, users }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticket) fetchComments();
  }, [ticket]);

  const fetchComments = async () => {
    try {
      const res = await ticketsAPI.getComments(ticket.id);
      setComments(res.data);
    } catch { /* empty */ }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await ticketsAPI.addComment(ticket.id, { content: newComment });
      setNewComment('');
      fetchComments();
    } catch {
      toast.error('Error al agregar comentario');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await ticketsAPI.update(ticket.id, { status: newStatus });
      onUpdate();
      toast.success(`Ticket ${newStatus.toLowerCase()}`);
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (userId) => {
    try {
      await ticketsAPI.update(ticket.id, { assigned_to: userId || null });
      onUpdate();
      toast.success('Tecnico asignado');
    } catch {
      toast.error('Error al asignar');
    }
  };

  if (!ticket) return null;
  const statusInfo = getStatusInfo(ticket.status);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <span className="text-muted-foreground font-mono text-sm">{ticket.ticket_number}</span>
          <span>{ticket.title}</span>
        </DialogTitle>
        <DialogDescription>Detalle del ticket, cambio de estado y comentarios.</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Meta info */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{ticket.status}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted">{ticket.category}</span>
        </div>

        {/* Description */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Creado por</p>
            <p className="font-medium">{ticket.created_by_name || 'Sistema'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha</p>
            <p className="font-medium">{new Date(ticket.created_at).toLocaleString('es')}</p>
          </div>
          {ticket.equipment_code && (
            <div>
              <p className="text-muted-foreground">Equipo</p>
              <p className="font-medium">{ticket.equipment_code}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Tecnico Asignado</p>
            <Select value={ticket.assigned_to || "none"} onValueChange={(v) => handleAssign(v === "none" ? null : v)}>
              <SelectTrigger className="h-8 mt-1" data-testid="assign-tech-select">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resolution notes */}
        {ticket.resolution_notes && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Notas de resolucion</p>
            <p className="text-sm">{ticket.resolution_notes}</p>
          </div>
        )}

        {/* Status actions */}
        {ticket.status !== 'Cerrado' && (
          <div className="flex gap-2">
            {ticket.status === 'Abierto' && (
              <Button size="sm" onClick={() => handleStatusChange('En Proceso')} disabled={updating} data-testid="ticket-start-btn">
                <CircleDot className="w-4 h-4 mr-1" />Iniciar
              </Button>
            )}
            {(ticket.status === 'Abierto' || ticket.status === 'En Proceso') && (
              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleStatusChange('Resuelto')} disabled={updating} data-testid="ticket-resolve-btn">
                <CheckCircle className="w-4 h-4 mr-1" />Resolver
              </Button>
            )}
            {ticket.status === 'Resuelto' && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('Cerrado')} disabled={updating} data-testid="ticket-close-btn">
                <X className="w-4 h-4 mr-1" />Cerrar
              </Button>
            )}
          </div>
        )}

        {/* Comments */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comentarios ({comments.length})
          </h4>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="p-3 rounded-lg border text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-xs">{c.author_name || 'Usuario'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString('es')}</span>
                </div>
                <p className="whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin comentarios</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Agregar comentario..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
              data-testid="ticket-comment-input"
            />
            <Button size="sm" onClick={handleAddComment} disabled={sending || !newComment.trim()} data-testid="ticket-comment-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// ==================== CREATE TICKET FORM ====================

function CreateTicketForm({ equipment, users, onSubmit, saving, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Media', category: 'General',
    equipment_id: '', assigned_to: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Titulo y descripcion son obligatorios');
      return;
    }
    onSubmit({
      ...form,
      equipment_id: form.equipment_id || null,
      assigned_to: form.assigned_to || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titulo *</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Resumen del problema"
          data-testid="ticket-title-input"
        />
      </div>
      <div className="space-y-2">
        <Label>Descripcion *</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Detalle del problema o solicitud..."
          rows={3}
          data-testid="ticket-description-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger data-testid="ticket-priority-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger data-testid="ticket-category-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Equipo (opcional)</Label>
          <Select value={form.equipment_id || "none"} onValueChange={(v) => setForm({ ...form, equipment_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Sin equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin equipo</SelectItem>
              {equipment.map(eq => (
                <SelectItem key={eq.id} value={eq.id}>{eq.inventory_code} - {eq.equipment_type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Asignar a (opcional)</Label>
          <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving} data-testid="ticket-save-btn">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crear Ticket
        </Button>
      </DialogFooter>
    </form>
  );
}

// ==================== TICKET TABLE ROW ====================

function TicketRow({ ticket, onClick }) {
  const statusInfo = getStatusInfo(ticket.status);
  const StatusIcon = statusInfo.icon;

  return (
    <tr
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(ticket)}
      data-testid={`ticket-row-${ticket.id}`}
    >
      <td>
        <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</p>
      </td>
      <td>
        <p className="font-medium text-sm">{ticket.title}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{ticket.description}</p>
      </td>
      <td>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3" />{ticket.status}
        </span>
      </td>
      <td>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </td>
      <td><span className="text-xs text-muted-foreground">{ticket.category}</span></td>
      <td>
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs">{ticket.assigned_to_name || 'Sin asignar'}</span>
        </div>
      </td>
      <td>
        <span className="text-xs text-muted-foreground">
          {new Date(ticket.created_at).toLocaleDateString('es')}
        </span>
      </td>
    </tr>
  );
}

// ==================== MAIN PAGE ====================

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => { fetchData(); }, [filterStatus, filterPriority]);

  const fetchData = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const [ticketsRes, statsRes, eqRes, usersRes] = await Promise.all([
        ticketsAPI.getAll(params),
        ticketsAPI.getStats(),
        equipmentAPI.getAll(),
        usersAPI.getAll()
      ]);
      setTickets(ticketsRes.data);
      setStats(statsRes.data);
      setEquipment(eqRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await ticketsAPI.create(data);
      toast.success('Ticket creado');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear ticket');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (ticket) => {
    try {
      const res = await ticketsAPI.getById(ticket.id);
      setDetailTicket(res.data);
      setDetailOpen(true);
    } catch {
      toast.error('Error al cargar ticket');
    }
  };

  const handleDetailUpdate = async () => {
    if (detailTicket) {
      const res = await ticketsAPI.getById(detailTicket.id);
      setDetailTicket(res.data);
    }
    fetchData();
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return t.title?.toLowerCase().includes(s) || t.ticket_number?.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" data-testid="tickets-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets de Soporte</h1>
          <p className="text-muted-foreground">Gestiona solicitudes y problemas de TI</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-ticket-btn"><Plus className="w-4 h-4 mr-2" />Nuevo Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Ticket de Soporte</DialogTitle>
              <DialogDescription>Completa los campos para crear una nueva solicitud.</DialogDescription>
            </DialogHeader>
            <CreateTicketForm
              equipment={equipment}
              users={users}
              onSubmit={handleCreate}
              saving={saving}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <TicketStats stats={stats} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterStatus || filterPriority) && (
              <Button variant="ghost" size="icon" onClick={() => { setFilterStatus(''); setFilterPriority(''); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 w-24">No.</th>
                    <th className="pb-3">Titulo</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Prioridad</th>
                    <th className="pb-3">Categoria</th>
                    <th className="pb-3">Asignado</th>
                    <th className="pb-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <TicketRow key={ticket.id} ticket={ticket} onClick={openDetail} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No hay tickets</h3>
              <p className="text-muted-foreground text-sm">
                {filterStatus || filterPriority || searchQuery ? 'No se encontraron tickets con estos filtros' : 'Crea el primer ticket de soporte'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailTicket(null); }}>
        <TicketDetail
          ticket={detailTicket}
          onClose={() => setDetailOpen(false)}
          onUpdate={handleDetailUpdate}
          users={users}
        />
      </Dialog>
    </div>
  );
}
