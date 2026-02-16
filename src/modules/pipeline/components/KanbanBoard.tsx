"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { moveLeadAction } from "@/modules/leads/actions/lead.actions";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";

interface StatusColumn {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
}

interface LeadItem {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status_id: string;
  lead_statuses: { name: string; slug: string; color: string } | null;
  lead_sources: { name: string; slug: string } | null;
  [key: string]: unknown;
}

interface Props {
  initialLeads: LeadItem[];
  statuses: StatusColumn[];
}

export function KanbanBoard({ initialLeads, statuses }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync local state when server component passes new leads (after router.refresh())
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as LeadItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === (payload.new as LeadItem).id
                  ? (payload.new as LeadItem)
                  : l
              )
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) =>
              prev.filter((l) => l.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatusId = over.id as string;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status_id === newStatusId) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status_id: newStatusId } : l
      )
    );

    try {
      await moveLeadAction(leadId, newStatusId);
      // Refresh server data to sync across all components
      await router.refresh();
    } catch {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? initialLeads.find((il) => il.id === leadId) ?? l
            : l
        )
      );
    }
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <DndContext
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            leads={leads.filter((l) => l.status_id === status.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
