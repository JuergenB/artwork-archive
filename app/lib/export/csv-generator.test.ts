import { describe, expect, it } from "vitest"
import {
  escapeCsvField,
  buildArtistCsvRow,
  buildArtworkCsvRow,
  generateCsv,
  generateArtistCsv,
  generateArtworkCsv,
  generateExportFileNames,
} from "./csv-generator"
import type { EnrichedArtist, EnrichedArtwork } from "./enrichment"
import { AA_ARTIST_COLUMNS, AA_ARTWORK_COLUMNS } from "@/lib/aa-columns"

// ─── Helpers ────────────────────────────────────────────

function makeArtist(overrides: Partial<EnrichedArtist> = {}): EnrichedArtist {
  return {
    id: "rec123",
    fullName: "Jane Doe",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    bio: "A painter from NYC",
    artistStatement: "I create art about nature",
    city: "new york",
    state: "New York",
    zipCode: "10001",
    country: "United States",
    nationality: "United States",
    primaryAddress: "123 main street",
    address2: null,
    phone: "555-123-4567",
    website: "janedoe.com",
    instagramUrl: "https://instagram.com/janedoe",
    facebookUrl: null,
    twitterUrl: null,
    linkedinUrl: null,
    pinterestUrl: null,
    contactImageUrl: "https://cdn.example.com/jane.jpg",
    status: "Approved for Export",
    profileAi: "Jane Doe is a **contemporary painter** based in NYC.",
    summaryAi: "NYC-based painter focusing on nature themes",
    tagsAi: "painting, nature, contemporary, Abstract",
    socialProfilesAi: "INSTAGRAM: https://instagram.com/janedoe",
    campaignIds: ["recCamp1"],
    artworkIds: ["recAw1"],
    partnerOrgIds: [],
    groups: "Not Real Art - Modern Love, Not Real Art 2026, Not Real Art",
    exhibitionHistory: "Participated in Modern Love presented by Not Real Art",
    ...overrides,
  }
}

function makeArtwork(overrides: Partial<EnrichedArtwork> = {}): EnrichedArtwork {
  return {
    id: "recAw1",
    pieceName: "Sunset Over Mountains",
    type: "Painting",
    medium: "Oil on canvas",
    subjectMatter: "Landscape",
    description: "A vibrant sunset painting, 24 x 36 inches",
    pieceImageUrls: '["https://cdn.example.com/sunset1.jpg","https://cdn.example.com/sunset2.jpg"]',
    yearCreatedDate: "2024",
    status: "Approved for Export",
    statusFromArtist: "Approved for Export",
    mediumAi: "Oil paint on stretched canvas",
    subjectMatterAi: "Mountain landscape at sunset with warm tones",
    tagsAi: "landscape, sunset, mountains, oil painting",
    relevanceHypothesisAi: "This landscape connects to the exhibition theme of nature's beauty",
    heightAi: 24,
    widthAi: 36,
    depthAi: null,
    dimensionsUnitAi: "inches",
    artistIds: ["rec123"],
    campaignIds: ["recCamp1"],
    campaignDescriptions: "Modern Love exhibition",
    linkToPurchaseUrl: "https://shop.example.com/sunset",
    artistEmail: "jane@example.com",
    collections: "Not Real Art - Modern Love, Not Real Art 2026, Not Real Art",
    artistFirstName: "Jane",
    artistLastName: "Doe",
    ...overrides,
  }
}

// ─── escapeCsvField ─────────────────────────────────────

describe("escapeCsvField", () => {
  it("returns empty string for empty input", () => {
    expect(escapeCsvField("")).toBe("")
  })

  it("passes through simple values", () => {
    expect(escapeCsvField("hello")).toBe("hello")
    expect(escapeCsvField("Jane Doe")).toBe("Jane Doe")
    expect(escapeCsvField("12345")).toBe("12345")
  })

  it("wraps values with commas in quotes", () => {
    expect(escapeCsvField("New York, NY")).toBe('"New York, NY"')
  })

  it("wraps values with quotes and escapes inner quotes", () => {
    expect(escapeCsvField('She said "hello"')).toBe('"She said ""hello"""')
  })

  it("wraps values with newlines in quotes", () => {
    expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"')
    expect(escapeCsvField("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"')
  })

  it("handles combined special characters", () => {
    expect(escapeCsvField('A "big", bold\nstatement')).toBe(
      '"A ""big"", bold\nstatement"',
    )
  })
})

// ─── buildArtistCsvRow ──────────────────────────────────

describe("buildArtistCsvRow", () => {
  it("produces array with correct length", () => {
    const row = buildArtistCsvRow(makeArtist())
    expect(row).toHaveLength(AA_ARTIST_COLUMNS.length)
    expect(row).toHaveLength(40)
  })

  it("maps name fields correctly", () => {
    const row = buildArtistCsvRow(makeArtist())
    expect(row[0]).toBe("Jane") // First Name
    expect(row[1]).toBe("Doe") // Last Name
  })

  it("applies nationality_normalize transform", () => {
    const row = buildArtistCsvRow(makeArtist({ nationality: "United States" }))
    expect(row[3]).toBe("American")
  })

  it("applies title_case to address fields", () => {
    const row = buildArtistCsvRow(makeArtist({ primaryAddress: "123 main street" }))
    expect(row[11]).toBe("123 Main Street")
  })

  it("applies state_abbreviation", () => {
    const row = buildArtistCsvRow(makeArtist({ state: "New York" }))
    expect(row[14]).toBe("NY")
  })

  it("applies phone_normalize", () => {
    const row = buildArtistCsvRow(makeArtist({ phone: "555-123-4567" }))
    expect(row[8]).toBe("555-123-4567")
  })

  it("applies url_validate to website", () => {
    const row = buildArtistCsvRow(makeArtist({ website: "janedoe.com" }))
    expect(row[25]).toBe("https://janedoe.com")
  })

  it("applies social_media_profile to Instagram", () => {
    const row = buildArtistCsvRow(makeArtist({ instagramUrl: "janedoe" }))
    expect(row[35]).toBe("https://www.instagram.com/janedoe")
  })

  it("applies ai_tags to Contact Tags", () => {
    const row = buildArtistCsvRow(makeArtist({ tagsAi: "painting, nature, contemporary, Abstract" }))
    expect(row[33]).toBe("Abstract, contemporary, nature, painting")
  })

  it("sets Artist column to TRUE", () => {
    const row = buildArtistCsvRow(makeArtist())
    expect(row[28]).toBe("TRUE")
  })

  it("builds Notes from multiple sources", () => {
    const row = buildArtistCsvRow(makeArtist())
    expect(row[23]).toContain("ARTIST STATEMENT")
    expect(row[23]).toContain("I create art about nature")
    expect(row[23]).toContain("SUMMARY (AI)")
    expect(row[23]).toContain("EXHIBITION HISTORY")
  })

  it("includes Groups from enrichment", () => {
    const row = buildArtistCsvRow(makeArtist({ groups: "Campaign A, Org 2026" }))
    expect(row[30]).toBe("Campaign A, Org 2026")
  })

  it("handles null fields gracefully", () => {
    const row = buildArtistCsvRow(makeArtist({
      address2: null,
      facebookUrl: null,
      pinterestUrl: null,
    }))
    expect(row[12]).toBe("") // Address 2
    expect(row[36]).toBe("") // Facebook
    expect(row[39]).toBe("") // Pinterest
  })
})

// ─── buildArtworkCsvRow ─────────────────────────────────

describe("buildArtworkCsvRow", () => {
  it("produces array with correct length", () => {
    const row = buildArtworkCsvRow(makeArtwork())
    expect(row).toHaveLength(AA_ARTWORK_COLUMNS.length)
    expect(row).toHaveLength(68)
  })

  it("maps piece name and artist name", () => {
    const row = buildArtworkCsvRow(makeArtwork())
    expect(row[0]).toBe("Sunset Over Mountains")
    expect(row[1]).toBe("Jane") // Artist First Name
    expect(row[2]).toBe("Doe") // Artist Last Name
  })

  it("applies field_concatenate to Medium", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      medium: "Oil on canvas",
      mediumAi: "Oil paint on stretched canvas",
    }))
    expect(row[4]).toContain("Oil on canvas")
    expect(row[4]).toContain("AI ANALYSIS:")
    expect(row[4]).toContain("Oil paint on stretched canvas")
  })

  it("skips AI ANALYSIS when medium values are identical", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      medium: "Watercolor",
      mediumAi: "watercolor",
    }))
    expect(row[4]).toBe("Watercolor")
    expect(row[4]).not.toContain("AI ANALYSIS")
  })

  it("applies dimension_format", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      heightAi: 24,
      widthAi: 36,
      depthAi: null,
      dimensionsUnitAi: "inches",
    }))
    expect(row[7]).toBe("24")
    expect(row[8]).toBe("36")
    expect(row[9]).toBe("") // null depth
  })

  it("converts cm to inches in dimensions", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      heightAi: 25.4,
      widthAi: 50.8,
      dimensionsUnitAi: "cm",
    }))
    expect(row[7]).toBe("10") // 25.4 / 2.54 = 10
    expect(row[8]).toBe("20") // 50.8 / 2.54 = 20
  })

  it("applies ai_tags to Tags", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      tagsAi: "landscape, sunset, mountains, oil painting",
    }))
    expect(row[26]).toBe("landscape, mountains, oil painting, sunset")
  })

  it("builds Notes from relevance hypothesis and purchase link", () => {
    const row = buildArtworkCsvRow(makeArtwork())
    expect(row[27]).toContain("EXHIBITION FIT (AI)")
    expect(row[27]).toContain("PURCHASE LINK")
    expect(row[27]).toContain("https://shop.example.com/sunset")
  })

  it("skips SKIP relevance hypothesis in Notes", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      relevanceHypothesisAi: "SKIP",
      linkToPurchaseUrl: null,
    }))
    expect(row[27]).toBe("")
  })

  it("includes Collections from enrichment", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      collections: "Campaign A, Org 2026, Org",
    }))
    expect(row[28]).toBe("Campaign A, Org 2026, Org")
  })

  it("applies pipe_separate to Piece Image URLs", () => {
    const row = buildArtworkCsvRow(makeArtwork({
      pieceImageUrls: '["https://cdn.example.com/a.jpg","https://cdn.example.com/b.jpg"]',
    }))
    expect(row[66]).toBe("https://cdn.example.com/a.jpg|https://cdn.example.com/b.jpg")
  })

  it("applies date_format to Creation Date", () => {
    const row = buildArtworkCsvRow(makeArtwork({ yearCreatedDate: "2024" }))
    expect(row[22]).toBe("2024") // Year-only passes through

    const row2 = buildArtworkCsvRow(makeArtwork({ yearCreatedDate: "2024-03-15" }))
    expect(row2[22]).toBe("03/15/2024")
  })
})

// ─── generateCsv ────────────────────────────────────────

describe("generateCsv", () => {
  it("generates valid CSV with headers and rows", () => {
    const csv = generateCsv(
      ["Name", "Email", "City"],
      [
        ["Jane Doe", "jane@example.com", "New York"],
        ["John Smith", "john@example.com", "Los Angeles"],
      ],
    )
    const lines = csv.split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe("Name,Email,City")
    expect(lines[1]).toBe("Jane Doe,jane@example.com,New York")
    expect(lines[2]).toBe("John Smith,john@example.com,Los Angeles")
  })

  it("escapes fields with special characters", () => {
    const csv = generateCsv(
      ["Notes"],
      [["Line 1\nLine 2, with comma"]],
    )
    // The CSV should contain the quoted field with embedded newline
    expect(csv).toContain('"Line 1\nLine 2, with comma"')
  })

  it("generates empty body with no rows", () => {
    const csv = generateCsv(["A", "B"], [])
    expect(csv).toBe("A,B")
  })
})

// ─── generateArtistCsv / generateArtworkCsv ─────────────

describe("generateArtistCsv", () => {
  it("includes AA template headers", () => {
    const csv = generateArtistCsv([makeArtist()])
    const firstLine = csv.split("\n")[0]
    expect(firstLine).toContain("First Name / Company Name")
    expect(firstLine).toContain("Last Name")
    expect(firstLine).toContain("Nationality")
    expect(firstLine).toContain("Contact Tags")
    expect(firstLine).toContain("Pinterest URL")
    // Count columns
    const headerCount = firstLine.split(",").length
    expect(headerCount).toBe(40)
  })

  it("includes data rows for multiple artists", () => {
    const csv = generateArtistCsv([makeArtist(), makeArtist({ firstName: "John", lastName: "Smith" })])
    // CSV has header + 2 data rows (data rows may contain embedded newlines in Notes)
    expect(csv).toContain("Jane")
    expect(csv).toContain("John")
    expect(csv).toContain("Smith")
  })
})

describe("generateArtworkCsv", () => {
  it("includes AA template headers", () => {
    const csv = generateArtworkCsv([makeArtwork()])
    const firstLine = csv.split("\n")[0]
    expect(firstLine).toContain("Piece Name")
    expect(firstLine).toContain("Artist First Name")
    expect(firstLine).toContain("Medium")
    expect(firstLine).toContain("Collections")
    expect(firstLine).toContain("Piece Image URLs")
  })
})

// ─── File Naming ────────────────────────────────────────

describe("generateExportFileNames", () => {
  it("generates files with date and campaign slug", () => {
    const { artistFileName, artworkFileName } = generateExportFileNames("Not Real Art - Modern Love")
    expect(artistFileName).toMatch(/^AA-Artists-Not-Real-Art---Modern-Love-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(artworkFileName).toMatch(/^AA-Artworks-Not-Real-Art---Modern-Love-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it("uses 'All' for all campaigns", () => {
    const { artistFileName } = generateExportFileNames("All Campaigns")
    expect(artistFileName).toMatch(/^AA-Artists-All-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
