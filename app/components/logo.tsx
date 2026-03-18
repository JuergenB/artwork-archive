import { Archive } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <Link
      href="/dashboard/home"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
        <Archive className="h-4 w-4" />
      </div>
      {!collapsed && (
        <span className="text-sm truncate">AA Export</span>
      )}
    </Link>
  )
}
