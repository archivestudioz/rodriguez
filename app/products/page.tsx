import { getProducts, getCategories } from "@/lib/queries";
import { PageHeader, Content } from "@/components/kit";
import { ProductManager } from "@/components/ProductManager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <>
      <PageHeader
        eyebrow="The Provision"
        title="Goods &amp; their measure"
        verse="Know the cost of every loaf, that the increase may be honest."
      />
      <Content>
        <ProductManager products={products} categories={categories} />
      </Content>
    </>
  );
}
