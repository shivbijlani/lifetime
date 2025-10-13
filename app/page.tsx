import { Suspense } from "react";
import FinancialProjectionSandbox from "@/components/FinancialProjectionSandbox";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={<div className="p-6">Loading projection…</div>}>
        <FinancialProjectionSandbox />
      </Suspense>
    </main>
  );
}
