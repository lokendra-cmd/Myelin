export default function TaskPlanLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-4 pb-28 pt-4 sm:px-6">
      <div className="h-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 flex gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
