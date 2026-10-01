import { connection } from "next/server";
import Dashboard from "@/components/Dashboard";
import Onboarding from "@/components/Onboarding";
import { loadAppData } from "@/lib/data";
import { igdbConfigured, isConfigured } from "@/lib/storage";

export default async function Page({ searchParams }: PageProps<"/">) {
  await connection(); // lu à chaque requête : les fichiers changent à chaque synchro
  const data = await loadAppData();
  const configured = isConfigured();
  const { tab } = await searchParams;
  return data ? (
    <Dashboard data={data} configured={configured} igdb={igdbConfigured()} initialTab={typeof tab === "string" ? tab : undefined} />
  ) : (
    <Onboarding configured={configured} />
  );
}
