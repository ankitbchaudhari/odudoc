import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/blog-store";
import { BlogPostingLd, BreadcrumbLd, FaqLd } from "@/components/StructuredData";
import { extractFaqs } from "@/lib/seo/extract-faqs";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: "Post not found" };
    return {
      title: post.title,
      description: post.excerpt,
      authors: post.author ? [{ name: post.author }] : undefined,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        type: "article",
        title: post.title,
        description: post.excerpt,
        url: `/blog/${post.slug}`,
        images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
        publishedTime: (post as any).publishedAt,
        modifiedTime: post.updatedAt,
        authors: post.author ? [post.author] : undefined,
        tags: post.tags,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.excerpt,
        images: post.imageUrl ? [post.imageUrl] : undefined,
      },
      keywords: post.tags,
    };
  } catch {
    return { title: "Blog" };
  }
}

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>> | null = null;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }
  return (
    <>
      {post && (
        <>
          <BlogPostingLd
            slug={post.slug}
            title={post.title}
            excerpt={post.excerpt}
            author={post.author}
            imageUrl={post.imageUrl}
            publishedAt={(post as any).publishedAt}
            updatedAt={post.updatedAt}
          />
          <BreadcrumbLd
            items={[
              { name: "Home", url: "/" },
              { name: "Blog", url: "/blog" },
              { name: post.title, url: `/blog/${post.slug}` },
            ]}
          />
          {(() => {
            // If the post contains an FAQ section (AI-generated posts should,
            // per our updated prompt), emit FAQPage schema for rich results.
            const faqs = extractFaqs(post.content);
            return faqs.length >= 2 ? FaqLd(faqs) : null;
          })()}
        </>
      )}
      {children}
    </>
  );
}
