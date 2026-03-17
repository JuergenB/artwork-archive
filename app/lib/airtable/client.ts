import Airtable from "airtable"

if (!process.env.AIRTABLE_API_KEY) {
  throw new Error("AIRTABLE_API_KEY is not set")
}

if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error("AIRTABLE_BASE_ID is not set")
}

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
export const base = airtable.base(process.env.AIRTABLE_BASE_ID)

// Helper to get a table by its env var name
// Usage: getTable("AIRTABLE_MY_TABLE_ID")
export function getTable(envVarName: string) {
  const tableId = process.env[envVarName]
  if (!tableId) {
    throw new Error(`${envVarName} is not set in environment variables`)
  }
  return base(tableId)
}
