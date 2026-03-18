import { getCampaigns } from "@/lib/airtable/client"
import { ExportPreview } from "./export-preview"

export const dynamic = "force-dynamic"

export default async function ExportPage() {
  const campaigns = await getCampaigns()

  // Sort alphabetically, filter to campaigns that have artists
  const activeCampaigns = campaigns
    .filter((c) => c.artistIds.length > 0)
    .sort((a, b) =>
      (a.campaignName ?? "").localeCompare(b.campaignName ?? "")
    )

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Preview &amp; Export
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select a campaign to preview approved artists and artworks, then export to Artwork Archive CSV format.
          </p>
        </div>
        <ExportPreview campaigns={activeCampaigns} />
      </div>
    </div>
  )
}
