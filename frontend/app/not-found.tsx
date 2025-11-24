import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-md w-full space-y-6 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">404 - Page Not Found</h1>
          <p className="text-muted-foreground text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard">Go back home</Link>
        </Button>
      </div>
    </div>
  )
}
