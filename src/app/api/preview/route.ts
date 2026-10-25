import { NextRequest, NextResponse } from "next/server";
import { getTemplateById } from "@/templates";
import { TemplateType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const templateId = (searchParams.get("template") as TemplateType) || "welcome";
  const template = getTemplateById(templateId);

  // Extract query params that override default template params
  const params: Record<string, string> = { ...template.defaultParams };
  searchParams.forEach((val, key) => {
    if (key !== "template") {
      params[key] = val;
    }
  });

  const html = template.generateHtml(params);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const templateId = (body.template as TemplateType) || "welcome";
    const template = getTemplateById(templateId);
    const params = { ...template.defaultParams, ...(body.params || {}) };
    const html = template.generateHtml(params);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return new NextResponse("Error generating preview", { status: 500 });
  }
}
