// Brain dump page
import { getCategories, getBrainDumpThoughts } from "@/actions/sprints";
import { BrainDumpWorkspace } from "@/components/brain-dump-workspace";

export const dynamic = "force-dynamic";

export default async function BrainDumpPage() {
  const categories = await getCategories();
  const thoughts = await getBrainDumpThoughts();

  return (
    <BrainDumpWorkspace
      initialCategories={categories}
      initialThoughts={thoughts}
    />
  );
}
