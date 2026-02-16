import { z } from "zod";

export const leadCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  company_id: z.string().uuid("Invalid company").nullable().optional(),
  source_id: z.string().uuid("Invalid source"),
  status_id: z.string().uuid("Invalid status"),
  notes: z.string().max(5000).nullable().optional(),
  assigned_to: z.string().uuid("Invalid user").nullable().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
