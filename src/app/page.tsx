import { connection } from "next/server";
import Dashboard from "@/components/Dashboard";
import Onboarding from "@/components/Onboarding";
import { loadAppData } from "@/lib/data";
import { igdbConfigured, isConfigured } from "@/lib/storage";

export default async function Page({ searchParams }: PageProps<"/">) {
  await connection(); // lu à chaque requête : les fichiers changent à chaque synchro
  const data = await loadAppData();
  const configured = isConfigured();
  const { tab, game } = await searchParams;
  return data ? (
    <Dashboard
      data={data}
      configured={configured}
      igdb={igdbConfigured()}
      initialTab={typeof tab === "string" ? tab : undefined}
      initialGame={typeof game === "string" ? Number(game) : undefined}
    />
  ) : (
    <Onboarding configured={configured} />
  );
}
