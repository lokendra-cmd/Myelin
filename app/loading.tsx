import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-80 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
      </div>
    </main>
  );
}
