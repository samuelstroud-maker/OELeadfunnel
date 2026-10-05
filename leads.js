import { getStore } from "@netlify/blobs";

const EMPTY = { leads: [], settings: { goal: 0 }, rev: 0 };

export default async (req) => {
  // Keep preview/branch deploys away from real data.
  const isProd = Netlify.context?.deploy?.context === "production";
  const store = getStore({ name: isProd ? "lead-funnel" : "lead-funnel-preview", consistency: "strong" });
  const current = (await store.get("data", { type: "json" })) || EMPTY;

  if (req.method === "GET") return Response.json(current);

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!Array.isArray(body.leads)) return Response.json({ error: "Missing leads" }, { status: 400 });
    // Reject stale writes so one device can't silently overwrite another.
    if (body.rev !== current.rev) return Response.json({ conflict: true, ...current }, { status: 409 });
    const next = { leads: body.leads, settings: body.settings || current.settings, rev: current.rev + 1, updated: new Date().toISOString() };
    await store.setJSON("data", next);
    return Response.json(next);
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/leads" };
