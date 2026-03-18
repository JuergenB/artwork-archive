import { auth } from "@/auth"
import { getApprovedArtists, getCampaigns, getExportLogs } from "@/lib/airtable/client"
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
  const [approvedArtists, campaigns, exportLogs] = await Promise.all([
    getApprovedArtists().catch(() => []),
    getCampaigns().catch(() => []),
    getExportLogs().catch(() => []),
  ])

  const activeCampaigns = campaigns.filter((c) => c.artistIds.length > 0)
  const totalArtworks = approvedArtists.reduce(
    (sum, a) => sum + a.artworkIds.length,
    0
  )

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Artists Ready
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedArtists.length}</div>
              <p className="text-xs text-muted-foreground">
                Approved for export
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Artworks Ready
              </CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArtworks}</div>
              <p className="text-xs text-muted-foreground">
                From approved artists
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Exports
              </CardTitle>
              <FileDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exportLogs.length}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Campaigns
              </CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCampaigns.length}</div>
              <p className="text-xs text-muted-foreground">
                With submissions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Jump to common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild className="w-full justify-between">
                <Link href="/dashboard/export">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview & Export
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/dashboard/export-logs">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Export Logs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link href="/dashboard/field-mappings">
                  <span className="flex items-center gap-2">
                    <TableProperties className="h-4 w-4" />
                    Field Mappings
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
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
    </div>
  )
}
