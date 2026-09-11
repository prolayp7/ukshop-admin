import { BlogPostFormPage } from "@/components/blog/blog-post-form-page";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogPostFormPage postId={Number(id)} />;
}
