/**
 * OMP Engine — Page Service
 *
 * Manages user-customizable pages with widget-based layouts.
 * Pages can display object lists, charts, pipeline views, processor reports, etc.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";
import { hasPermission } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { AppError } from "@/lib/utils/errors";
import { auditLog } from "@/lib/audit/logger";

export interface PageWidget {
  id: string;
  pageId: string;
  widgetType: "stat_card" | "chart" | "object_list" | "pipeline" | "timeline" | "table_view" | "processor_report";
  title: string;
  config: WidgetConfig;
  position: number;
  width: number;
}

export interface WidgetConfig {
  /** For stat_card: which module/field/agg to display */
  moduleName?: string;
  fieldKey?: string;
  aggType?: "sum" | "avg" | "count" | "min" | "max";
  /** For chart: chart type */
  chartType?: "bar" | "pie" | "line" | "area";
  /** For object_list and pipeline: filter by object type */
  objectType?: string;
  /** For pipeline: which field to group by */
  groupByField?: string;
  groupByModule?: string;
  /** For processor_report: which processor */
  processorName?: string;
  /** For timeline: object ID */
  objectId?: string;
  /** General: color */
  color?: string;
  /** General: max items */
  limit?: number;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  layout: { columns: number };
  isPublic: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  widgets: PageWidget[];
}

export interface PageCreateInput {
  name: string;
  description?: string;
  icon?: string;
  layout?: { columns: number };
  isPublic?: boolean;
}

/** Auto-generate a URL-safe slug from a name. */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "page";
}

export interface PageWidgetCreateInput {
  pageId: string;
  widgetType: PageWidget["widgetType"];
  title: string;
  config: WidgetConfig;
  position?: number;
  width?: number;
}

// ── Service Methods ──────────────────────────

/** Check if the user is the page owner or has settings:manage */
function requirePageAccess(ctx: AuthContext, createdBy: string | null): void {
  if (ctx.userId === createdBy) return;
  if (hasPermission(ctx, Actions.SETTINGS_MANAGE)) return;
  throw new AppError("FORBIDDEN", "You do not have access to this page");
}

/**
 * List all pages accessible to the user.
 */
export async function getPages(ctx: AuthContext): Promise<Page[]> {
  const admin = createAdminClient();

  const { data, error } = await (admin as any)
    .from("pages")
    .select("*")
    .or(`is_public.eq.true,created_by.eq.${ctx.userId}`)
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DB_ERROR", error.message);

  // Load widgets for all pages
  const pageIds = (data ?? []).map((p: any) => p.id);
  const { data: widgets } = pageIds.length > 0
    ? await (admin as any)
        .from("page_widgets")
        .select("*")
        .in("page_id", pageIds)
        .order("position")
    : { data: [] };

  const widgetsByPage = new Map<string, PageWidget[]>();
  for (const w of widgets ?? []) {
    const list = widgetsByPage.get(w.page_id) ?? [];
    list.push({
      id: w.id,
      pageId: w.page_id,
      widgetType: w.widget_type as PageWidget["widgetType"],
      title: w.title,
      config: (w.config ?? {}) as WidgetConfig,
      position: w.position,
      width: w.width,
    });
    widgetsByPage.set(w.page_id, list);
  }

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    icon: p.icon ?? "FileText",
    layout: (p.layout ?? { columns: 2 }) as { columns: number },
    isPublic: p.is_public,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    widgets: widgetsByPage.get(p.id) ?? [],
  }));
}

/**
 * Get a single page by slug.
 */
export async function getPageBySlug(ctx: AuthContext, slug: string): Promise<Page | null> {
  const admin = createAdminClient();

  const { data: p, error } = await (admin as any)
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !p) return null;

  // Load widgets
  const { data: widgets } = await (admin as any)
    .from("page_widgets")
    .select("*")
    .eq("page_id", (p as any).id)
    .order("position");

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    icon: p.icon ?? "FileText",
    layout: (p.layout ?? { columns: 2 }) as { columns: number },
    isPublic: p.is_public,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    widgets: (widgets ?? []).map((w: any) => ({
      id: w.id,
      pageId: w.page_id,
      widgetType: w.widget_type as PageWidget["widgetType"],
      title: w.title,
      config: (w.config ?? {}) as WidgetConfig,
      position: w.position,
      width: w.width,
    })),
  };
}

/**
 * Create a new page.
 */
export async function createPage(ctx: AuthContext, input: PageCreateInput): Promise<Page> {
  const admin = createAdminClient();

  // Auto-generate slug from name, appending a suffix if it already exists
  let slug = generateSlug(input.name);
  const { data: existing } = await (admin as any)
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data, error } = await (admin as any)
    .from("pages")
    .insert({
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? "FileText",
      layout: (input.layout ?? { columns: 2 }) as any,
      is_public: input.isPublic ?? true,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "page:create",
    category: "settings",
    entityType: "page",
    entityId: data.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon ?? "FileText",
    layout: (data.layout ?? { columns: 2 }) as { columns: number },
    isPublic: data.is_public,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    widgets: [],
  };
}

/**
 * Delete a page.
 */
export async function deletePage(ctx: AuthContext, pageId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: page } = await (admin as any)
    .from("pages")
    .select("created_by")
    .eq("id", pageId)
    .single();

  if (!page) throw new AppError("NOT_FOUND", "Page not found");

  // Only the creator or a settings admin can delete
  requirePageAccess(ctx, page.created_by);

  const { error } = await (admin as any).from("pages").delete().eq("id", pageId);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: "page:delete",
    category: "settings",
    entityType: "page",
    entityId: pageId,
  });
}

/**
 * Add a widget to a page.
 */
export async function addWidget(ctx: AuthContext, input: PageWidgetCreateInput): Promise<PageWidget> {
  const admin = createAdminClient();

  // Verify page ownership
  const { data: page } = await (admin as any)
    .from("pages")
    .select("created_by")
    .eq("id", input.pageId)
    .single();
  if (!page) throw new AppError("NOT_FOUND", "Page not found");
  requirePageAccess(ctx, page.created_by);

  // Get next position
  const { data: existing } = await (admin as any)
    .from("page_widgets")
    .select("position")
    .eq("page_id", input.pageId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = input.position ?? ((existing?.[0]?.position ?? -1) + 1);

  const { data, error } = await (admin as any)
    .from("page_widgets")
    .insert({
      page_id: input.pageId,
      widget_type: input.widgetType,
      title: input.title,
      config: input.config as any,
      position: nextPos,
      width: input.width ?? 1,
    })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  return {
    id: data.id,
    pageId: data.page_id,
    widgetType: data.widget_type as PageWidget["widgetType"],
    title: data.title,
    config: (data.config ?? {}) as WidgetConfig,
    position: data.position,
    width: data.width,
  };
}

/**
 * Remove a widget from a page.
 */
export async function removeWidget(ctx: AuthContext, widgetId: string): Promise<void> {
  const admin = createAdminClient();

  // Verify ownership via widget → page
  const { data: widget } = await (admin as any)
    .from("page_widgets")
    .select("page_id")
    .eq("id", widgetId)
    .single();
  if (widget) {
    const { data: page } = await (admin as any)
      .from("pages")
      .select("created_by")
      .eq("id", widget.page_id)
      .single();
    if (page) requirePageAccess(ctx, page.created_by);
  }

  const { error } = await (admin as any).from("page_widgets").delete().eq("id", widgetId);
  if (error) throw new AppError("DB_ERROR", error.message);
}

/**
 * Update a widget's config.
 */
export async function updateWidget(
  ctx: AuthContext,
  widgetId: string,
  updates: { title?: string; config?: WidgetConfig; width?: number; position?: number }
): Promise<PageWidget> {
  const admin = createAdminClient();

  // Verify ownership via widget → page
  const { data: existing } = await (admin as any)
    .from("page_widgets")
    .select("page_id")
    .eq("id", widgetId)
    .single();
  if (existing) {
    const { data: page } = await (admin as any)
      .from("pages")
      .select("created_by")
      .eq("id", existing.page_id)
      .single();
    if (page) requirePageAccess(ctx, page.created_by);
  }

  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.config !== undefined) updateData.config = updates.config;
  if (updates.width !== undefined) updateData.width = updates.width;
  if (updates.position !== undefined) updateData.position = updates.position;

  const { data, error } = await (admin as any)
    .from("page_widgets")
    .update(updateData)
    .eq("id", widgetId)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  return {
    id: data.id,
    pageId: data.page_id,
    widgetType: data.widget_type as PageWidget["widgetType"],
    title: data.title,
    config: (data.config ?? {}) as WidgetConfig,
    position: data.position,
    width: data.width,
  };
}
