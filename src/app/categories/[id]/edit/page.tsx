import { CategoryFormPage } from "@/components/categories/category-form-page";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CategoryFormPage categoryId={Number(id)} />;
}
