import { redirect } from "next/navigation";

export default async function RepoPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  // `params` may be a Promise in Next.js app router; await it before use
  const resolvedParams = await params;
  const { repoId } = resolvedParams;
  
  // Redirect to the getting started page by default
  redirect(`/repo/${repoId}/getting-started`);
}


