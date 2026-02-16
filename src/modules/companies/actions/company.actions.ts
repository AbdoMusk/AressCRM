"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as companyService from "../services/company.service";
import type { CompanyInsert, CompanyUpdate } from "../types/company.types";

export async function createCompanyAction(input: CompanyInsert) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const company = await companyService.createCompany(ctx, input);
  revalidatePath("/companies");
  revalidatePath("/leads");
  return company;
}

export async function updateCompanyAction(id: string, input: CompanyUpdate) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const company = await companyService.updateCompany(ctx, id, input);
  revalidatePath("/companies");
  return company;
}

export async function deleteCompanyAction(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await companyService.deleteCompany(ctx, id);
  revalidatePath("/companies");
  revalidatePath("/leads");
}

export async function addCompanyMemberAction(
  companyId: string,
  userId: string,
  role: string = "member"
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await companyService.addCompanyMember(ctx, companyId, userId, role);
  revalidatePath("/companies");
}

export async function removeCompanyMemberAction(
  companyId: string,
  userId: string
) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await companyService.removeCompanyMember(ctx, companyId, userId);
  revalidatePath("/companies");
}

/** Quick-create a company by name (used from lead form), returns the new company */
export async function createCompanyQuickAction(name: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const company = await companyService.createCompanyQuick(ctx, name);
  revalidatePath("/companies");
  return company;
}
