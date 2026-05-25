import { getCurrentUser } from "@/lib/currentUser";
import { logAudit } from "@/lib/db/audit";
import { getDepartment } from "@/lib/departments";
import { getEmailProvider } from "@/lib/email/providers";
import { isServerSupabaseConfigured } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
) {
  if (!isServerSupabaseConfigured()) {
    return Response.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const { slug, id } = await ctx.params;
  const department = getDepartment(slug);
  if (!department) {
    return Response.json(
      { error: `Unknown department: ${slug}` },
      { status: 404 }
    );
  }

  const provider = getEmailProvider();
  const message = await provider.getMessage(id);

  if (!message || message.department !== department.slug) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const user = getCurrentUser();
  await logAudit({
    userId: user.id,
    action: "DEPT_MAILBOX_VIEW",
    entityType: "department_message",
    entityId: message.id,
    metadata: {
      department: department.slug,
      provider: provider.name,
      direction: message.direction,
    },
  });

  return Response.json({ message, provider: provider.name });
}
