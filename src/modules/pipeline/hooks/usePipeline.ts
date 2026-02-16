"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type StatusChangeHandler = {
  onInsert?: (status: Record<string, unknown>) => void;
  onUpdate?: (status: Record<string, unknown>) => void;
  onDelete?: (old: Partial<Record<string, unknown>>) => void;
};

/**
 * Subscribes to realtime changes on the `lead_statuses` table.
 * Useful for Kanban columns updating when an admin renames/recolors a status.
 */
export function usePipelineRealtime(handlers: StatusChangeHandler) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("statuses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_statuses" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            handlers.onInsert?.(payload.new);
          } else if (payload.eventType === "UPDATE") {
            handlers.onUpdate?.(payload.new);
          } else if (payload.eventType === "DELETE") {
            handlers.onDelete?.(payload.old);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
