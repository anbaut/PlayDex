import { runSync } from "@/lib/sync";
import type { SyncEvent } from "@/lib/types";

/** Lance la synchro et renvoie la progression en NDJSON (un événement par ligne). */
export async function POST() {
  const encoder = new TextEncoder();
  const send = (c: ReadableStreamDefaultController, ev: SyncEvent) => c.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runSync()) send(controller, ev);
      } catch (e) {
        send(controller, { error: e instanceof Error ? e.message : String(e) });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
