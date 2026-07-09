import { PageHeader, Content } from "@/components/kit";
import { Importer } from "@/components/Importer";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Offering"
        title="Bring in the day&rsquo;s sales"
        verse="What the register has recorded, let it be gathered and weighed."
      />
      <Content>
        <Importer />
      </Content>
    </>
  );
}
