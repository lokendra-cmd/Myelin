import { getMentalToolkitSections } from "@/actions/mental-toolkit";
import { MentalToolkitWorkspace } from "@/components/mental-toolkit-workspace";

export const dynamic = "force-dynamic";

export default async function MentalToolkitPage() {
  const sections = await getMentalToolkitSections();

  return <MentalToolkitWorkspace initialSections={sections} />;
}
