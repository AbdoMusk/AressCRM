"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow } from "../types/lead.types";

type LeadChangeHandler = {
  onInsert?: (lead: LeadRow) => void;
  onUpdate?: (lead: LeadRow) => void;
  onDelete?: (oldLead: Partial<LeadRow>) => void;
};

/**
 * Subscribes to realtime changes on the `leads` table.
 * Handlers should be memoized (useCallback) by the consumer to avoid
 * unnecessary re-subscriptions.
 * 
 * Includes error handling and automatic reconnection attempts.
 */
export function useLeadRealtime(handlers: LeadChangeHandler) {
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const subscribe = useCallback(() => {
    try {
      const supabase = createClient();

      const channel = supabase
        .channel("leads-changes", { config: { broadcast: { ack: true } } })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "leads" },
          (payload) => {
            handlers.onInsert?.(payload.new as LeadRow);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "leads" },
          (payload) => {
            handlers.onUpdate?.(payload.new as LeadRow);
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "leads" },
          (payload) => {
            handlers.onDelete?.(payload.old as Partial<LeadRow>);
          }
        )
        .on("system", { event: "join" }, () => {
          setConnected(true);
          setRetryCount(0);
        })
        .on("system", { event: "presenceDiff" }, () => {
          // Presence event handler
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnected(true);
            setRetryCount(0);
          } else if (status === "CHANNEL_ERROR") {
            setConnected(false);
            if (retryCount < 5) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
              setTimeout(() => {
                setRetryCount((r) => r + 1);
              }, delay);
            }
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error("Realtime subscription error:", err);
      setConnected(false);
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => {
          setRetryCount((r) => r + 1);
        }, delay);
      }
    }
  }, [handlers, retryCount]);

  useEffect(() => {
    const cleanup = subscribe();
    return cleanup;
  }, [subscribe]);

  return { connected };
}
