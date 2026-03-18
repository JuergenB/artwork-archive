"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface MappingRow {
  aaColumn: string
  aaColumnIndex: number
  entityType: "artist" | "artwork"
  sourceField: string | null
  transform: string | null
  writeBack: boolean
  active: boolean
  notes: string | null
  defaultValue: string | null
  isMapped: boolean
  isTransformInput: boolean
}

export const columns: ColumnDef<MappingRow>[] = [
  {
    accessorKey: "aaColumnIndex",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        #
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums text-xs">
        {row.original.isTransformInput ? "" : row.getValue("aaColumnIndex")}
      </span>
    ),
  },
  {
    accessorKey: "aaColumn",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        AA Column
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, table }) => {
      const isMapped = row.original.isMapped
      const isInput = row.original.isTransformInput
      const aaCol = row.getValue("aaColumn") as string

      if (isInput) {
        // Count which input # this is among transform input rows only
        const allRows = table.getCoreRowModel().rows
        const inputSiblings = allRows.filter(
          (r) =>
            r.original.aaColumn === aaCol &&
            r.original.entityType === row.original.entityType &&
            r.original.isTransformInput
        )
        const idx = inputSiblings.findIndex((r) => r.id === row.id) + 1
        return (
          <span className="text-muted-foreground pl-4">
            ↳ {aaCol} [{idx}/{inputSiblings.length}]
          </span>
        )
      }

      return (
        <span className={isMapped ? "font-medium" : "text-muted-foreground"}>
          {aaCol}
        </span>
      )
    },
  },
  {
    accessorKey: "entityType",
    header: "Entity",
    cell: ({ row }) => {
      const value = row.getValue("entityType") as string
      return (
        <Badge variant={value === "artist" ? "default" : "secondary"} className="text-xs">
          {value}
        </Badge>
      )
    },
    filterFn: "equals",
  },
  {
    accessorKey: "sourceField",
    header: "Source Field",
    cell: ({ row }) => {
      const value = row.getValue("sourceField") as string | null
      if (!value) return <span className="text-muted-foreground">—</span>
      return (
        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
          {value}
        </code>
      )
    },
  },
  {
    accessorKey: "transform",
    header: "Transform",
    cell: ({ row }) => {
      const value = row.getValue("transform") as string | null
      if (!value || value === "none") return <span className="text-muted-foreground">—</span>
      return (
        <code className="text-sm bg-muted px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">
          {value}
        </code>
      )
    },
  },
  {
    accessorKey: "writeBack",
    header: "Write Back",
    cell: ({ row }) => (
      row.getValue("writeBack")
        ? <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Yes</Badge>
        : <span className="text-muted-foreground">—</span>
    ),
  },
  {
    accessorKey: "active",
    header: "Active",
    cell: ({ row }) => (
      row.original.isMapped
        ? row.getValue("active")
          ? <span className="text-green-600 text-sm">Active</span>
          : <span className="text-muted-foreground text-sm">Inactive</span>
        : <span className="text-muted-foreground">—</span>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const value = row.getValue("notes") as string | null
      if (!value) return null
      return (
        <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
          {value}
        </span>
      )
    },
  },
]
