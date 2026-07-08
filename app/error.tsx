"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-semibold">Myelin hit a snag</h1>
        <p className="mt-3 text-sm text-zinc-500">{error.message}</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </Card>
    </main>
  );
}
