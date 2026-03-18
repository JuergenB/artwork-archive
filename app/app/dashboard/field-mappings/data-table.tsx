"use client"

import { useMemo, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { MappingRow } from "./columns"

interface DataTableProps {
  columns: ColumnDef<MappingRow, unknown>[]
  data: MappingRow[]
}

export function DataTable({ columns, data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "aaColumnIndex", desc: false },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "entityType", value: "artist" },
  ])
  const [hideUnmapped, setHideUnmapped] = useState(true)

  const filteredData = useMemo(() => {
    return hideUnmapped ? data.filter((row) => row.isMapped) : data
  }, [data, hideUnmapped])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  const entityFilter = (table.getColumn("entityType")?.getFilterValue() as string) ?? ""

  const counts = useMemo(() => {
    const source = hideUnmapped ? filteredData : data
    const entityScope = entityFilter
      ? data.filter((r) => r.entityType === entityFilter)
      : data
    return {
      all: source.length,
      artist: source.filter((r) => r.entityType === "artist").length,
      artwork: source.filter((r) => r.entityType === "artwork").length,
      unmapped: entityScope.filter((r) => !r.isMapped).length,
    }
  }, [data, filteredData, hideUnmapped, entityFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={entityFilter === "artist" ? "default" : "outline"}
            size="sm"
            onClick={() => table.getColumn("entityType")?.setFilterValue("artist")}
          >
            Artist ({counts.artist})
          </Button>
          <Button
            variant={entityFilter === "artwork" ? "default" : "outline"}
            size="sm"
            onClick={() => table.getColumn("entityType")?.setFilterValue("artwork")}
          >
            Artwork ({counts.artwork})
          </Button>
          <Button
            variant={!entityFilter ? "default" : "outline"}
            size="sm"
            onClick={() => table.getColumn("entityType")?.setFilterValue("")}
          >
            All ({counts.all})
          </Button>
        </div>

        <Button
          variant={hideUnmapped ? "default" : "outline"}
          size="sm"
          onClick={() => setHideUnmapped(!hideUnmapped)}
        >
          {hideUnmapped
            ? `Show unmapped (${counts.unmapped})`
            : `Hide unmapped (${counts.unmapped})`}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.isMapped ? "" : "opacity-50"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No mappings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
