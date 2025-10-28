import RepoDisplay from "@/component/repo/RepoDisplay";

export default async function RepoPage({ params }: { params: { repoId: string } | Promise<{ repoId: string }> }) {
  // `params` may be a Promise in Next.js app router; await it before use
  const resolvedParams = await params;
  const { repoId } = resolvedParams;
  return <RepoDisplay repoId={repoId} />;
}


