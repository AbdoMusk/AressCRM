import { z } from "zod";

export const companyCreateSchema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  industry: z.string().max(200).nullable().optional(),
  website: z.string().url("Invalid URL").max(500).nullable().optional().or(z.literal("")),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  assigned_to: z.string().uuid("Invalid user").nullable().optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
