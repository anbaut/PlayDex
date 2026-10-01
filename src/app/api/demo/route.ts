import { loadDemo } from "@/lib/demo";

export async function POST() {
  const count = await loadDemo();
  return Response.json({ count });
}
