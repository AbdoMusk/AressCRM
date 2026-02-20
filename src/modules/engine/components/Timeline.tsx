"use client";

import { useState } from "react";
import { tw } from "./DynamicField";
import type { TimelineEvent } from "@/modules/engine/services/timeline.service";
import { addNoteAction } from "@/modules/engine/actions/timeline.actions";
import { useRouter } from "next/navigation";
import {
  Clock,
  ArrowRightLeft,
  MessageSquare,
  Link2,
  Layers,
  Zap,
  Send,
} from "lucide-react";

interface Props {
  objectId: string;
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  status_change: <ArrowRightLeft size={14} />,
  note: <MessageSquare size={14} />,
  relation_added: <Link2 size={14} />,
  relation_removed: <Link2 size={14} />,
  module_attached: <Layers size={14} />,
  module_detached: <Layers size={14} />,
  custom: <Zap size={14} />,
};

const EVENT_COLORS: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
  note: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  relation_added: "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
  relation_removed: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
  module_attached: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
  module_detached: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
  custom: "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400",
};

export function Timeline({ objectId, events }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await addNoteAction(objectId, note.trim());
      if (!result.success) {
        setError(result.error ?? "Failed to add note");
        return;
      }
      setNote("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleAddNote} className={tw.card}>
        <div className="flex gap-2">
          <input
            className={tw.input}
            placeholder="Add a note to the timeline..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !note.trim()}
            className={tw.btnPrimary}
          >
            <Send size={14} />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </form>

      {/* Timeline */}
      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No timeline events yet. Add a note or change a status to start tracking.
        </p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 h-full w-px bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="relative flex gap-3 pl-2">
                {/* Icon dot */}
                <div
                  className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${EVENT_COLORS[event.eventType] ?? EVENT_COLORS.custom}`}
                >
                  {EVENT_ICONS[event.eventType] ?? EVENT_ICONS.custom}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      <Clock size={10} className="mr-0.5 inline" />
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </div>

                  {/* Metadata chips for status changes */}
                  {event.eventType === "status_change" && event.metadata && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {String(event.metadata.oldValue ?? "?")}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {String(event.metadata.newValue ?? "?")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
