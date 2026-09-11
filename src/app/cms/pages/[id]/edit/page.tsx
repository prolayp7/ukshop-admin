import { PageFormPage } from "@/components/cms-pages/page-form-page";

export default async function EditCmsPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageFormPage pageId={Number(id)} />;
}
