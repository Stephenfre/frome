import { Suspense } from "react";

import { GmailConnectCard } from "@/components/settings/gmail-connect-card";

export default function IntegrationsPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8">
      <section className="grid gap-2">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-3xl font-semibold tracking-normal">Integrations</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Connect the services ForMe can read from, starting with Gmail.
        </p>
      </section>

      <section className="grid gap-5">
        <Suspense fallback={<div className="h-60 rounded-xl border bg-muted/20" />}>
          <GmailConnectCard />
        </Suspense>
      </section>
    </div>
  );
}
