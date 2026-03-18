import { ExportLogsViewer } from "./export-logs-viewer"

export const dynamic = "force-dynamic"

export default function ExportLogsPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Export Logs
          </h1>
          <p className="mt-2 text-muted-foreground">
            History of past exports with download links and status tracking.
          </p>
        </div>
        <ExportLogsViewer />
      </div>
    </div>
  )
}
