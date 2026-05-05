from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import asyncio
import logging
from database import db
from auth import get_current_user
from models import TicketCreate, TicketUpdate, TicketResponse, TicketCommentCreate, TicketCommentResponse
from helpers import generate_id, now_iso
from services.email_service import send_email

router = APIRouter()

TICKET_STATUSES = ["Abierto", "En Proceso", "Resuelto", "Cerrado"]
TICKET_PRIORITIES = ["Baja", "Media", "Alta", "Critica"]
TICKET_CATEGORIES = ["General", "Hardware", "Software", "Red", "Accesos", "Email", "Impresora", "Otro"]


async def _is_solicitante(user: dict) -> bool:
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0, "name": 1})
        if role and role.get("name") == "Solicitante":
            return True
    return False


async def _send_ticket_email(ticket: dict, event_type: str, extra_info: str = ""):
    """Send email notification for ticket events"""
    try:
        ticket_number = ticket.get("ticket_number", "N/A")
        title = ticket.get("title", "")
        status = ticket.get("status", "")
        priority = ticket.get("priority", "")

        recipients = set()

        # Get creator email
        if ticket.get("created_by"):
            creator = await db.users.find_one({"id": ticket["created_by"]}, {"_id": 0, "email": 1, "name": 1})
            if creator and creator.get("email"):
                recipients.add(creator["email"])

        # Get assigned tech email
        if ticket.get("assigned_to"):
            tech = await db.users.find_one({"id": ticket["assigned_to"]}, {"_id": 0, "email": 1, "name": 1})
            if tech and tech.get("email"):
                recipients.add(tech["email"])

        if not recipients:
            return

        priority_colors = {"Baja": "#64748b", "Media": "#3b82f6", "Alta": "#f59e0b", "Critica": "#ef4444"}
        p_color = priority_colors.get(priority, "#3b82f6")

        if event_type == "created":
            subject = f"Nuevo Ticket {ticket_number}: {title}"
            body_text = f"Se ha creado un nuevo ticket de soporte."
        elif event_type == "status_changed":
            subject = f"Ticket {ticket_number} - Estado: {status}"
            body_text = f"El estado del ticket ha cambiado a <strong>{status}</strong>."
        elif event_type == "comment":
            subject = f"Nuevo comentario en Ticket {ticket_number}"
            body_text = f"Se agregó un comentario al ticket."
        else:
            subject = f"Actualización Ticket {ticket_number}"
            body_text = "El ticket ha sido actualizado."

        html = f"""<!DOCTYPE html><html><head><style>
            body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
            .container {{ max-width: 550px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ background: #1e40af; padding: 16px 24px; color: white; }}
            .content {{ padding: 24px; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }}
            .footer {{ background: #f8f9fa; padding: 12px 24px; font-size: 12px; color: #666; text-align: center; }}
            .detail {{ margin: 12px 0; padding: 12px; background: #f8f9fa; border-radius: 6px; }}
        </style></head><body>
        <div class="container">
            <div class="header"><h3 style="margin:0;">InventarioTI - Tickets</h3></div>
            <div class="content">
                <p>{body_text}</p>
                <div class="detail">
                    <p style="margin:0 0 8px;"><strong>{ticket_number}</strong> - {title}</p>
                    <p style="margin:0;">
                        <span class="badge" style="background:{p_color}20;color:{p_color};">{priority}</span>
                        <span class="badge" style="background:#e2e8f0;color:#475569;margin-left:6px;">{status}</span>
                    </p>
                </div>
                {f'<p style="margin-top:12px;padding:10px;background:#f0fdf4;border-radius:6px;font-size:13px;">{extra_info}</p>' if extra_info else ''}
            </div>
            <div class="footer">Notificación automática de InventarioTI</div>
        </div></body></html>"""

        for email_addr in recipients:
            await send_email(email_addr, subject, html)
            await asyncio.sleep(0.1)
    except Exception as e:
        logging.error(f"Error sending ticket email: {str(e)}")


async def _enrich_ticket(ticket: dict) -> dict:
    if ticket.get("equipment_id"):
        eq = await db.equipment.find_one({"id": ticket["equipment_id"]}, {"_id": 0, "inventory_code": 1})
        ticket["equipment_code"] = eq.get("inventory_code") if eq else None
    if ticket.get("assigned_to"):
        user = await db.users.find_one({"id": ticket["assigned_to"]}, {"_id": 0, "name": 1})
        ticket["assigned_to_name"] = user.get("name") if user else None
    if ticket.get("created_by"):
        user = await db.users.find_one({"id": ticket["created_by"]}, {"_id": 0, "name": 1})
        ticket["created_by_name"] = user.get("name") if user else None
    return ticket


async def _next_ticket_number() -> str:
    last = await db.tickets.find({}, {"_id": 0, "ticket_number": 1}).sort("created_at", -1).to_list(1)
    if last and last[0].get("ticket_number"):
        try:
            num = int(last[0]["ticket_number"].replace("TK-", "")) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"TK-{num:04d}"


@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    # Solicitante only sees their own tickets
    if await _is_solicitante(current_user):
        query["created_by"] = current_user.get("id")
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if category:
        query["category"] = category
    if assigned_to:
        query["assigned_to"] = assigned_to

    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    result = []
    for t in tickets:
        t = await _enrich_ticket(t)
        result.append(TicketResponse(**t))
    return result


@router.get("/tickets/stats")
async def get_ticket_stats(current_user: dict = Depends(get_current_user)):
    base_query = {}
    if await _is_solicitante(current_user):
        base_query["created_by"] = current_user.get("id")

    total = await db.tickets.count_documents(base_query)
    open_count = await db.tickets.count_documents({**base_query, "status": "Abierto"})
    in_progress = await db.tickets.count_documents({**base_query, "status": "En Proceso"})
    resolved = await db.tickets.count_documents({**base_query, "status": "Resuelto"})
    closed = await db.tickets.count_documents({**base_query, "status": "Cerrado"})

    by_priority = {}
    for p in TICKET_PRIORITIES:
        by_priority[p] = await db.tickets.count_documents({"priority": p})

    by_category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_category_raw = await db.tickets.aggregate(by_category_pipeline).to_list(20)
    by_category = [{"category": r["_id"] or "Sin categoria", "count": r["count"]} for r in by_category_raw]

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
        "by_priority": by_priority,
        "by_category": by_category
    }


# ==================== STATIC ROUTES (before {ticket_id}) ====================

@router.get("/tickets/options/constants")
async def get_ticket_constants(current_user: dict = Depends(get_current_user)):
    return {
        "statuses": TICKET_STATUSES,
        "priorities": TICKET_PRIORITIES,
        "categories": TICKET_CATEGORIES
    }


@router.get("/tickets/my-equipment")
async def get_my_assigned_equipment(current_user: dict = Depends(get_current_user)):
    """Get equipment assigned to the current user (for solicitantes)"""
    eq_ids = current_user.get("assigned_equipment_ids", [])
    if not eq_ids:
        return []
    equipment = await db.equipment.find(
        {"id": {"$in": eq_ids}}, {"_id": 0, "id": 1, "inventory_code": 1, "equipment_type": 1, "brand": 1, "model": 1}
    ).to_list(50)
    return equipment


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if await _is_solicitante(current_user) and ticket.get("created_by") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="No tiene acceso a este ticket")
    ticket = await _enrich_ticket(ticket)
    return TicketResponse(**ticket)


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(data: TicketCreate, current_user: dict = Depends(get_current_user)):
    ticket_number = await _next_ticket_number()
    ticket = {
        "id": generate_id(),
        "ticket_number": ticket_number,
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "category": data.category,
        "status": "Abierto",
        "equipment_id": data.equipment_id,
        "assigned_to": data.assigned_to,
        "created_by": current_user.get("id"),
        "resolution_notes": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "closed_at": None
    }
    await db.tickets.insert_one(ticket)
    ticket = await _enrich_ticket(ticket)
    del ticket["_id"]

    # Send email notification for new ticket
    await _send_ticket_email(ticket, "created")

    return TicketResponse(**ticket)


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: str, data: TicketUpdate, current_user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if await _is_solicitante(current_user):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar tickets")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = now_iso()

    if "status" in update_data:
        if update_data["status"] in ["Resuelto", "Cerrado"] and not ticket.get("closed_at"):
            update_data["closed_at"] = now_iso()

    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    updated = await _enrich_ticket(updated)

    # Send email notification if status changed
    if "status" in data.model_dump(exclude_unset=True):
        await _send_ticket_email(updated, "status_changed")

    return TicketResponse(**updated)


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    if await _is_solicitante(current_user):
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar tickets")
    result = await db.tickets.delete_one({"id": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    await db.ticket_comments.delete_many({"ticket_id": ticket_id})
    return {"message": "Ticket eliminado"}


# ==================== TICKET COMMENTS ====================

@router.get("/tickets/{ticket_id}/comments", response_model=List[TicketCommentResponse])
async def get_ticket_comments(ticket_id: str, current_user: dict = Depends(get_current_user)):
    if await _is_solicitante(current_user):
        ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0, "created_by": 1})
        if not ticket or ticket.get("created_by") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="No tiene acceso a este ticket")
    comments = await db.ticket_comments.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    result = []
    for c in comments:
        if c.get("author_id"):
            user = await db.users.find_one({"id": c["author_id"]}, {"_id": 0, "name": 1})
            c["author_name"] = user.get("name") if user else None
        result.append(TicketCommentResponse(**c))
    return result


@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentResponse)
async def create_ticket_comment(ticket_id: str, data: TicketCommentCreate, current_user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if await _is_solicitante(current_user) and ticket.get("created_by") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="No tiene acceso a este ticket")

    comment = {
        "id": generate_id(),
        "ticket_id": ticket_id,
        "content": data.content,
        "author_id": current_user.get("id"),
        "author_name": current_user.get("name"),
        "created_at": now_iso()
    }
    await db.ticket_comments.insert_one(comment)
    del comment["_id"]

    # Send email notification for new comment
    ticket_for_email = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if ticket_for_email:
        author_name = current_user.get("name", "Usuario")
        await _send_ticket_email(
            ticket_for_email, "comment",
            extra_info=f"<strong>{author_name}:</strong> {data.content[:200]}"
        )

    return TicketCommentResponse(**comment)
