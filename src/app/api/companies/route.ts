import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as companyService from "@/modules/companies/services/company.service";
import { handleApiError } from "@/lib/utils/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await companyService.getCompanies(ctx);
    return NextResponse.json({ data: companies });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const company = await companyService.createCompany(ctx, body);
    return NextResponse.json({ data: company }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
