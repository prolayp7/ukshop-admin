import { notFound } from "next/navigation";
import { NewProductPage } from "@/components/products/new-product-page";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <NewProductPage productType="standard" productId={Number(id)} />;
}
