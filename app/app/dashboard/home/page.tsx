import { auth } from "@/auth"
import { getApprovedArtists, getArtworks, getCampaigns, getExportLogs } from "@/lib/airtable/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import {
  Users,
  Image,
  FileDown,
  Eye,
  TableProperties,
  FileText,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Megaphone,
} from "lucide-react"

export const dynamic = "force-dynamic"

function formatDate(timestamp: string | null): string {
  if (!timestamp) return "N/A"
  try {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    })
  } catch {
    return "N/A"
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case "Exported":
    case "Delivered":
    case "Accepted":
      return "default"
    case "In Progress":
      return "secondary"
    case "Failed":
    case "Rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function getRoleBadgeVariant(role: string | undefined): "default" | "secondary" | "outline" {
  switch (role) {
    case "admin":
      return "default"
    case "curator":
      return "secondary"
    default:
      return "outline"
  }
}

export default async function HomePage() {
  const session = await auth()

  // Fetch data in parallel
  const [approvedArtists, approvedArtworks, campaigns, exportLogs] = await Promise.all([
    getApprovedArtists().catch(() => []),
    getArtworks('{Status} = "Approved for Export"').catch(() => []),
    getCampaigns().catch(() => []),
    getExportLogs().catch(() => []),
  ])

  const activeCampaigns = campaigns.filter((c) => c.artistIds.length > 0)

  // Sort logs by timestamp descending and take the most recent 5
  const recentLogs = [...exportLogs]
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })
    .slice(0, 5)

  const displayName = session?.user?.displayName || session?.user?.name || "User"
  const role = session?.user?.role

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {displayName}
            </h1>
            {role && (
              <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                {role}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            Export enriched artist and artwork records to Artwork Archive CSV format.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { title: "Artists Ready", value: approvedArtists.length, label: "Approved for export", icon: Users },
            { title: "Artworks Ready", value: approvedArtworks.length, label: "Approved for export", icon: Image },
            { title: "Total Exports", value: exportLogs.length, label: "All time", icon: FileDown },
            { title: "Active Campaigns", value: activeCampaigns.length, label: "With submissions", icon: Megaphone },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{stat.title}</span>
                  <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works + Companion */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Workflow Steps */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Three steps from Airtable to Artwork Archive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                <div>
                  <p className="text-sm font-semibold">Preview &amp; Export</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Select a campaign (or all), review the enriched artist and artwork records with all transforms applied, then generate the CSV files. Use test mode to verify without changing any Airtable records.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                <div>
                  <p className="text-sm font-semibold">Send to Artwork Archive</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    After export, click &ldquo;Compose Email&rdquo; to open a pre-filled email with the CSV download links. Send it to Justin and the AA team for import.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                <div>
                  <p className="text-sm font-semibold">Track &amp; Confirm</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Monitor each export in Export Logs. Once Justin confirms the import went through, mark it as &ldquo;Accepted.&rdquo; If there&rsquo;s an issue, mark it &ldquo;Rejected&rdquo; with notes and re-export.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Each Page Does */}
          <Card>
            <CardHeader>
              <CardTitle>Your Tools</CardTitle>
              <CardDescription>
                What each section does
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-4">
                <Eye className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <Link href="/dashboard/export" className="text-sm font-semibold hover:underline underline-offset-2">Preview &amp; Export</Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    See exactly what will be sent to AA before generating files. Every field is transformed to match the AA import template &mdash; state abbreviations, normalized URLs, AI-enriched notes, campaign collections, and more.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-4">
                <FileText className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <Link href="/dashboard/export-logs" className="text-sm font-semibold hover:underline underline-offset-2">Export Logs</Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    History of every export with download links, status tracking, and one-click email compose. Accept or reject exports as Justin processes them.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-4">
                <TableProperties className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <Link href="/dashboard/field-mappings" className="text-sm font-semibold hover:underline underline-offset-2">Field Mappings</Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Shows how each Airtable field maps to an AA template column, including which data transform is applied. This is the reference for understanding what the export does to your data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Exports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
            <CardDescription>
              Latest export activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No exports yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Exports will appear here once you run your first one.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {recentLogs.map((log, index) => (
                  <div key={log.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.campaignNames || "All Campaigns"}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(log.timestamp)}
                            </span>
                            {log.artistCount && (
                              <span>{log.artistCount} artists</span>
                            )}
                            {log.artworkCount && (
                              <span>{log.artworkCount} artworks</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={getStatusColor(log.exportStatus) as "default" | "secondary" | "destructive" | "outline"}
                        className="shrink-0"
                      >
                        {log.exportStatus || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {exportLogs.length > 5 && (
                  <div className="pt-4">
                    <Button asChild variant="ghost" size="sm" className="w-full">
                      <Link href="/dashboard/export-logs">
                        View all {exportLogs.length} exports
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
