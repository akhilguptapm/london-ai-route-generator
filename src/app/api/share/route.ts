import { checkShareRateLimit, getClientId } from "@/lib/rate-limit";
import { rejectIfNotFromProxy } from "@/lib/proxy-guard";
import { parseShareRequest, savePlan } from "@/lib/saved-plans";
import { sharePath } from "@/lib/share-plan";

export async function POST(req: Request) {
  const blocked = rejectIfNotFromProxy(req);
  if (blocked) return blocked;

  const limit = await checkShareRateLimit(getClientId(req));
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return Response.json(
      {
        error: "rate_limited",
        message: `You've saved a lot of plans in a short time. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseShareRequest(body);
  if (!parsed) {
    return Response.json(
      { error: "incomplete", message: "Generate a complete itinerary before saving it." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const plan = await savePlan(parsed);
    return Response.json(
      { id: plan.id, expiresAt: plan.expiresAt, path: sharePath(plan.id) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[share] save failed:", error);
    return Response.json(
      { error: "save_failed", message: "We couldn't save this plan. Please try again in a moment." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
