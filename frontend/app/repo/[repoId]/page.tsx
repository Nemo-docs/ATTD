import { redirect } from "next/navigation";

export default async function RepoPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  // `params` may be a Promise in Next.js app router; await it before use
  const resolvedParams = await params;
  const { repoId } = resolvedParams;
  
  // Redirect to the intro page by default
  redirect(`/repo/${repoId}/intro`);
}


