import { NewProductPage } from "@/components/products/new-product-page";

export default async function AddProductPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <NewProductPage productType={type === "variants" ? "variants" : "standard"} />;
}
