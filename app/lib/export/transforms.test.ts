import { describe, expect, it } from "vitest"
import {
  stateAbbreviation,
  urlValidate,
  socialMediaProfile,
  titleCase,
  phoneNormalize,
  pipeSeparate,
  dimensionFormat,
  dateFormat,
  stripMarkdown,
  aiTags,
  notesBuilder,
  buildArtistNotes,
  buildArtworkNotes,
  fieldConcatenate,
  collectionsExpand,
  nationalityNormalize,
  applyTransform,
} from "./transforms"

// ─── State Abbreviation ─────────────────────────────────────

describe("stateAbbreviation", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(stateAbbreviation(null)).toBe("")
    expect(stateAbbreviation(undefined)).toBe("")
    expect(stateAbbreviation("")).toBe("")
    expect(stateAbbreviation("  ")).toBe("")
  })

  it("converts full state names to abbreviations", () => {
    expect(stateAbbreviation("Florida")).toBe("FL")
    expect(stateAbbreviation("california")).toBe("CA")
    expect(stateAbbreviation("NEW YORK")).toBe("NY")
    expect(stateAbbreviation("north carolina")).toBe("NC")
    expect(stateAbbreviation("District of Columbia")).toBe("DC")
  })

  it("passes through already-valid 2-letter abbreviations", () => {
    expect(stateAbbreviation("FL")).toBe("FL")
    expect(stateAbbreviation("ny")).toBe("NY")
    expect(stateAbbreviation("Ca")).toBe("CA")
  })

  it("handles territories", () => {
    expect(stateAbbreviation("Puerto Rico")).toBe("PR")
    expect(stateAbbreviation("Guam")).toBe("GU")
    expect(stateAbbreviation("American Samoa")).toBe("AS")
  })

  it("passes through non-US values", () => {
    expect(stateAbbreviation("Ontario")).toBe("Ontario")
    expect(stateAbbreviation("Bavaria")).toBe("Bavaria")
    expect(stateAbbreviation("XY")).toBe("XY") // not a valid US state
  })

  it("trims whitespace", () => {
    expect(stateAbbreviation("  Florida  ")).toBe("FL")
  })
})

// ─── URL Validate ───────────────────────────────────────────

describe("urlValidate", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(urlValidate(null)).toBe("")
    expect(urlValidate(undefined)).toBe("")
    expect(urlValidate("")).toBe("")
  })

  it("adds https:// if missing", () => {
    expect(urlValidate("example.com")).toBe("https://example.com")
    expect(urlValidate("www.example.com")).toBe("https://www.example.com")
  })

  it("preserves existing https://", () => {
    expect(urlValidate("https://example.com")).toBe("https://example.com")
  })

  it("preserves http://", () => {
    expect(urlValidate("http://example.com")).toBe("http://example.com")
  })

  it("strips trailing slash", () => {
    expect(urlValidate("https://example.com/")).toBe("https://example.com")
    expect(urlValidate("example.com/path/")).toBe("https://example.com/path")
  })

  it("handles URLs with paths", () => {
    expect(urlValidate("example.com/page/sub")).toBe(
      "https://example.com/page/sub",
    )
  })
})

// ─── Social Media Profile ───────────────────────────────────

describe("socialMediaProfile", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(socialMediaProfile(null)).toBe("")
    expect(socialMediaProfile(undefined)).toBe("")
    expect(socialMediaProfile("")).toBe("")
  })

  describe("Instagram", () => {
    it("normalizes handle with platform hint", () => {
      expect(socialMediaProfile("artguy", "instagram")).toBe(
        "https://www.instagram.com/artguy",
      )
    })

    it("normalizes @handle", () => {
      expect(socialMediaProfile("@artguy", "instagram")).toBe(
        "https://www.instagram.com/artguy",
      )
    })

    it("normalizes full URL", () => {
      expect(
        socialMediaProfile("https://www.instagram.com/artguy"),
      ).toBe("https://www.instagram.com/artguy")
    })

    it("normalizes partial URL", () => {
      expect(socialMediaProfile("instagram.com/artguy")).toBe(
        "https://www.instagram.com/artguy",
      )
    })

    it("normalizes URL with trailing slash", () => {
      expect(socialMediaProfile("https://instagram.com/artguy/")).toBe(
        "https://www.instagram.com/artguy",
      )
    })
  })

  describe("Facebook", () => {
    it("normalizes Facebook URL", () => {
      expect(
        socialMediaProfile("https://www.facebook.com/mypage"),
      ).toBe("https://www.facebook.com/mypage")
    })

    it("normalizes handle with platform hint", () => {
      expect(socialMediaProfile("mypage", "facebook")).toBe(
        "https://www.facebook.com/mypage",
      )
    })
  })

  describe("LinkedIn", () => {
    it("normalizes LinkedIn profile URL", () => {
      expect(
        socialMediaProfile("https://linkedin.com/in/johndoe"),
      ).toBe("https://www.linkedin.com/in/johndoe")
    })

    it("normalizes handle with platform hint", () => {
      expect(socialMediaProfile("johndoe", "linkedin")).toBe(
        "https://www.linkedin.com/in/johndoe",
      )
    })
  })

  describe("Twitter/X", () => {
    it("normalizes twitter.com URL to x.com", () => {
      expect(
        socialMediaProfile("https://twitter.com/artguy"),
      ).toBe("https://x.com/artguy")
    })

    it("normalizes x.com URL", () => {
      expect(socialMediaProfile("https://x.com/artguy")).toBe(
        "https://x.com/artguy",
      )
    })

    it("normalizes handle with platform hint", () => {
      expect(socialMediaProfile("@artguy", "twitter")).toBe(
        "https://x.com/artguy",
      )
    })
  })

  describe("Pinterest", () => {
    it("normalizes Pinterest URL", () => {
      expect(
        socialMediaProfile("https://pinterest.com/artboard"),
      ).toBe("https://www.pinterest.com/artboard")
    })
  })

  describe("unknown platform", () => {
    it("falls back to URL validation for unknown platform", () => {
      expect(socialMediaProfile("example.com/profile", "tiktok")).toBe(
        "https://example.com/profile",
      )
    })

    it("falls back to URL validation when no platform detected", () => {
      expect(socialMediaProfile("somesite.com/user")).toBe(
        "https://somesite.com/user",
      )
    })
  })
})

// ─── Title Case ─────────────────────────────────────────────

describe("titleCase", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(titleCase(null)).toBe("")
    expect(titleCase(undefined)).toBe("")
    expect(titleCase("")).toBe("")
  })

  it("converts all-lowercase address", () => {
    expect(titleCase("123 main street")).toBe("123 Main Street")
  })

  it("converts ALL-CAPS address", () => {
    expect(titleCase("123 MAIN STREET")).toBe("123 Main Street")
  })

  it("handles directionals", () => {
    expect(titleCase("123 n main st nw")).toBe("123 N Main St NW")
  })

  it("handles Mc* names in addresses", () => {
    expect(titleCase("123 n. mcallister st nw")).toBe(
      "123 N. McAllister St NW",
    )
  })

  it("handles ALL-CAPS city", () => {
    expect(titleCase("REHOBOTH BEACH")).toBe("Rehoboth Beach")
  })

  it("handles minor words", () => {
    expect(titleCase("village of los lunas")).toBe("Village of Los Lunas")
  })

  it("handles ordinals", () => {
    expect(titleCase("123 2ND AVE")).toBe("123 2nd Ave")
  })

  // Note: Do NOT use title_case on artist names — see #57
})

// ─── Phone Normalize ────────────────────────────────────────

describe("phoneNormalize", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(phoneNormalize(null)).toBe("")
    expect(phoneNormalize(undefined)).toBe("")
    expect(phoneNormalize("")).toBe("")
  })

  it("cleans up extra whitespace", () => {
    expect(phoneNormalize("+1  323-823-0201")).toBe("+1 323-823-0201")
  })

  it("passes through international formats", () => {
    expect(phoneNormalize("+49 172 4183031")).toBe("+49 172 4183031")
    expect(phoneNormalize("+91 9830676626")).toBe("+91 9830676626")
  })

  it("passes through US formats", () => {
    expect(phoneNormalize("+17089856018")).toBe("+17089856018")
  })
})

// ─── Pipe Separate ──────────────────────────────────────────

describe("pipeSeparate", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(pipeSeparate(null)).toBe("")
    expect(pipeSeparate(undefined)).toBe("")
    expect(pipeSeparate("")).toBe("")
  })

  it("handles JSON array of URLs", () => {
    expect(
      pipeSeparate('["https://a.com/1.jpg","https://b.com/2.jpg"]'),
    ).toBe("https://a.com/1.jpg|https://b.com/2.jpg")
  })

  it("handles comma-separated URLs", () => {
    expect(pipeSeparate("https://a.com/1.jpg, https://b.com/2.jpg")).toBe(
      "https://a.com/1.jpg|https://b.com/2.jpg",
    )
  })

  it("handles newline-separated URLs", () => {
    expect(
      pipeSeparate("https://a.com/1.jpg\nhttps://b.com/2.jpg"),
    ).toBe("https://a.com/1.jpg|https://b.com/2.jpg")
  })

  it("adds https:// to URLs missing protocol", () => {
    expect(pipeSeparate("a.com/1.jpg, b.com/2.jpg")).toBe(
      "https://a.com/1.jpg|https://b.com/2.jpg",
    )
  })

  it("handles single URL", () => {
    expect(pipeSeparate("https://a.com/1.jpg")).toBe("https://a.com/1.jpg")
  })
})

// ─── Dimension Format ───────────────────────────────────────

describe("dimensionFormat", () => {
  it("returns empty string for null/undefined", () => {
    expect(dimensionFormat(null)).toBe("")
    expect(dimensionFormat(undefined)).toBe("")
  })

  it("returns empty string for 0", () => {
    expect(dimensionFormat(0)).toBe("")
  })

  it("converts number to string", () => {
    expect(dimensionFormat(18.5)).toBe("18.5")
    expect(dimensionFormat(24)).toBe("24")
  })

  it("converts string number", () => {
    expect(dimensionFormat("18.5")).toBe("18.5")
  })

  it("returns empty string for non-numeric string", () => {
    expect(dimensionFormat("abc")).toBe("")
  })

  it("converts cm to inches when unit is cm", () => {
    // 25.4 cm = 10 inches
    expect(dimensionFormat(25.4, "cm")).toBe("10")
  })

  it("passes through inches when unit is not cm", () => {
    expect(dimensionFormat(18.5, "inches")).toBe("18.5")
    expect(dimensionFormat(18.5, null)).toBe("18.5")
  })

  it("handles decimal precision from cm conversion", () => {
    // 10 cm = 3.937... inches
    const result = dimensionFormat(10, "cm")
    expect(parseFloat(result)).toBeCloseTo(3.937, 2)
  })
})

// ─── Date Format ────────────────────────────────────────────

describe("dateFormat", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(dateFormat(null)).toBe("")
    expect(dateFormat(undefined)).toBe("")
    expect(dateFormat("")).toBe("")
  })

  it("passes through year-only", () => {
    expect(dateFormat("2024")).toBe("2024")
    expect(dateFormat("1998")).toBe("1998")
  })

  it("converts ISO to mm/dd/yyyy", () => {
    expect(dateFormat("2024-03-15")).toBe("03/15/2024")
    expect(dateFormat("2023-12-01")).toBe("12/01/2023")
  })

  it("passes through already-formatted mm/dd/yyyy", () => {
    expect(dateFormat("03/15/2024")).toBe("03/15/2024")
  })

  it("passes through unrecognized formats", () => {
    expect(dateFormat("March 2024")).toBe("March 2024")
  })
})

// ─── Strip Markdown ─────────────────────────────────────────

describe("stripMarkdown", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(stripMarkdown(null)).toBe("")
    expect(stripMarkdown(undefined)).toBe("")
    expect(stripMarkdown("")).toBe("")
  })

  it("removes headers", () => {
    expect(stripMarkdown("## Artist Bio\nSome text")).toBe(
      "Artist Bio\nSome text",
    )
  })

  it("removes bold", () => {
    expect(stripMarkdown("This is **bold** text")).toBe("This is bold text")
  })

  it("removes italic", () => {
    expect(stripMarkdown("This is *italic* text")).toBe("This is italic text")
  })

  it("removes links, keeping text", () => {
    expect(stripMarkdown("[Visit](https://example.com)")).toBe("Visit")
  })

  it("removes inline code", () => {
    expect(stripMarkdown("Use `code` here")).toBe("Use code here")
  })

  it("removes blockquotes", () => {
    expect(stripMarkdown("> Quoted text")).toBe("Quoted text")
  })

  it("removes unordered list markers", () => {
    expect(stripMarkdown("- Item one\n- Item two")).toBe("Item one\nItem two")
  })

  it("handles complex markdown", () => {
    const input = `## Bio

**John Doe** is an [artist](https://example.com) based in *New York*.

> Known for bold work.

- Painting
- Sculpture`
    const result = stripMarkdown(input)
    expect(result).not.toContain("##")
    expect(result).not.toContain("**")
    expect(result).not.toContain("*")
    expect(result).not.toContain("[")
    expect(result).not.toContain(">")
    expect(result).toContain("John Doe")
    expect(result).toContain("artist")
    expect(result).toContain("New York")
  })
})

// ─── AI Tags ────────────────────────────────────────────────

describe("aiTags", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(aiTags(null)).toBe("")
    expect(aiTags(undefined)).toBe("")
    expect(aiTags("")).toBe("")
  })

  it("deduplicates tags", () => {
    expect(aiTags("abstract, abstract, landscape")).toBe("abstract, landscape")
  })

  it("deduplicates case-insensitively", () => {
    expect(aiTags("Abstract, abstract, ABSTRACT")).toBe("Abstract")
  })

  it("sorts alphabetically", () => {
    expect(aiTags("zebra, apple, mango")).toBe("apple, mango, zebra")
  })

  it("trims whitespace", () => {
    expect(aiTags("  tag1 ,  tag2 , tag3  ")).toBe("tag1, tag2, tag3")
  })

  it("handles single tag", () => {
    expect(aiTags("painting")).toBe("painting")
  })

  it("filters empty entries", () => {
    expect(aiTags("tag1,, ,tag2")).toBe("tag1, tag2")
  })
})

// ─── Notes Builder ──────────────────────────────────────────

describe("notesBuilder", () => {
  it("returns empty string when all sections are empty", () => {
    expect(
      notesBuilder([
        { heading: "A", content: null },
        { heading: "B", content: "" },
      ]),
    ).toBe("")
  })

  it("builds single section", () => {
    expect(
      notesBuilder([{ heading: "STATEMENT", content: "My art is..." }]),
    ).toBe("STATEMENT:\nMy art is...")
  })

  it("joins multiple sections with separator", () => {
    const result = notesBuilder([
      { heading: "A", content: "First" },
      { heading: "B", content: "Second" },
    ])
    expect(result).toContain("A:\nFirst")
    expect(result).toContain("══════════════════════════════")
    expect(result).toContain("B:\nSecond")
  })

  it("skips empty sections", () => {
    const result = notesBuilder([
      { heading: "A", content: "First" },
      { heading: "B", content: null },
      { heading: "C", content: "Third" },
    ])
    expect(result).not.toContain("B:")
    expect(result).toContain("A:\nFirst")
    expect(result).toContain("C:\nThird")
  })

  it("strips markdown when requested", () => {
    const result = notesBuilder([
      { heading: "PROFILE", content: "**Bold** text", stripMd: true },
    ])
    expect(result).toBe("PROFILE:\nBold text")
  })
})

describe("buildArtistNotes", () => {
  it("builds complete artist notes", () => {
    const result = buildArtistNotes({
      artistStatement: "I create art",
      profileAi: "**John** is an artist",
      exhibitionHistory: "Exhibited at Gallery X",
      socialProfiles: "Instagram: https://instagram.com/john",
      summaryAi: "Emerging artist",
      tagsAi: "abstract, modern",
    })
    expect(result).toContain("ARTIST STATEMENT:\nI create art")
    expect(result).toContain("ARTIST PROFILE (AI):\nJohn is an artist") // markdown stripped
    expect(result).toContain("EXHIBITION HISTORY:")
    expect(result).toContain("ADDITIONAL SOCIAL PROFILES (AI):")
    expect(result).toContain("SUMMARY (AI):")
    expect(result).toContain("TAGS (AI):")
  })

  it("omits empty sections", () => {
    const result = buildArtistNotes({
      artistStatement: "I create art",
      profileAi: null,
      exhibitionHistory: null,
      socialProfiles: null,
      summaryAi: null,
      tagsAi: null,
    })
    expect(result).toBe("ARTIST STATEMENT:\nI create art")
    expect(result).not.toContain("PROFILE")
  })
})

describe("buildArtworkNotes", () => {
  it("builds artwork notes with relevance and purchase link", () => {
    const result = buildArtworkNotes({
      relevanceHypothesisAi: "Strong connection to exhibition theme",
      linkToPurchaseUrl: "https://shop.example.com/piece1",
    })
    expect(result).toContain("EXHIBITION FIT (AI):")
    expect(result).toContain("PURCHASE LINK:")
  })

  it("skips relevance when SKIP", () => {
    const result = buildArtworkNotes({
      relevanceHypothesisAi: "SKIP",
      linkToPurchaseUrl: "https://shop.example.com",
    })
    expect(result).not.toContain("EXHIBITION FIT")
    expect(result).toContain("PURCHASE LINK:")
  })

  it("skips relevance when skip (case-insensitive)", () => {
    const result = buildArtworkNotes({
      relevanceHypothesisAi: "skip",
      linkToPurchaseUrl: null,
    })
    expect(result).toBe("")
  })

  it("returns empty when all null", () => {
    expect(buildArtworkNotes({ relevanceHypothesisAi: null, linkToPurchaseUrl: null })).toBe("")
  })
})

// ─── Field Concatenate ──────────────────────────────────────

describe("fieldConcatenate", () => {
  it("returns empty string when both null", () => {
    expect(fieldConcatenate(null, null)).toBe("")
  })

  it("returns artist value when AI is empty", () => {
    expect(fieldConcatenate("Oil on canvas", null)).toBe("Oil on canvas")
    expect(fieldConcatenate("Oil on canvas", "")).toBe("Oil on canvas")
  })

  it("returns AI value when artist is empty", () => {
    expect(fieldConcatenate(null, "Acrylic")).toBe("Acrylic")
    expect(fieldConcatenate("", "Acrylic")).toBe("Acrylic")
  })

  it("concatenates when both present and different", () => {
    const result = fieldConcatenate("Oil on canvas", "Oil painting, mixed media")
    expect(result).toBe("Oil on canvas\n\nAI ANALYSIS: Oil painting, mixed media")
  })

  it("returns artist value only when same (case-insensitive)", () => {
    expect(fieldConcatenate("Oil on canvas", "oil on canvas")).toBe(
      "Oil on canvas",
    )
  })
})

// ─── Collections Expand ─────────────────────────────────────

describe("collectionsExpand", () => {
  it("returns empty string when campaign is null", () => {
    expect(
      collectionsExpand({ campaignName: null, partnerOrgName: null, year: null }),
    ).toBe("")
  })

  it("returns campaign only when no partner org", () => {
    expect(
      collectionsExpand({
        campaignName: "Direct Campaign",
        partnerOrgName: null,
        year: "2026",
      }),
    ).toBe("Direct Campaign")
  })

  it("returns full hierarchy with partner org", () => {
    expect(
      collectionsExpand({
        campaignName: "NRA - Modern Love",
        partnerOrgName: "Not Real Art",
        year: "2026",
      }),
    ).toBe("NRA - Modern Love, Not Real Art 2026, Not Real Art")
  })

  it("deduplicates when campaign name equals org name", () => {
    expect(
      collectionsExpand({
        campaignName: "Not Real Art",
        partnerOrgName: "Not Real Art",
        year: "2026",
      }),
    ).toBe("Not Real Art, Not Real Art 2026")
  })

  it("handles missing year", () => {
    expect(
      collectionsExpand({
        campaignName: "NRA - Modern Love",
        partnerOrgName: "Not Real Art",
        year: null,
      }),
    ).toBe("NRA - Modern Love, Not Real Art")
  })
})

// ─── Apply Transform (dispatcher) ───────────────────────────

describe("applyTransform", () => {
  it("returns value for none/null transform", () => {
    expect(applyTransform("none", "hello")).toBe("hello")
    expect(applyTransform(null, "hello")).toBe("hello")
  })

  it("returns empty string for null value with none transform", () => {
    expect(applyTransform(null, null)).toBe("")
  })

  it("dispatches state_abbreviation", () => {
    expect(applyTransform("state_abbreviation", "Florida")).toBe("FL")
  })

  it("dispatches url_validate", () => {
    expect(applyTransform("url_validate", "example.com")).toBe(
      "https://example.com",
    )
  })

  it("dispatches title_case", () => {
    expect(applyTransform("title_case", "REHOBOTH BEACH")).toBe(
      "Rehoboth Beach",
    )
  })

  it("dispatches date_format", () => {
    expect(applyTransform("date_format", "2024-03-15")).toBe("03/15/2024")
  })

  it("dispatches ai_tags", () => {
    expect(applyTransform("ai_tags", "b, a, b")).toBe("a, b")
  })

  it("dispatches dimension_format with unit option", () => {
    expect(applyTransform("dimension_format", "25.4", { unit: "cm" })).toBe(
      "10",
    )
  })

  it("dispatches social_media_profile with platform option", () => {
    expect(
      applyTransform("social_media_profile", "artguy", {
        platform: "instagram",
      }),
    ).toBe("https://www.instagram.com/artguy")
  })

  it("passes through for context-dependent transforms", () => {
    expect(applyTransform("notes_builder", "raw")).toBe("raw")
    expect(applyTransform("field_concatenate", "raw")).toBe("raw")
    expect(applyTransform("collections_expand", "raw")).toBe("raw")
  })

  it("dispatches nationality_normalize", () => {
    expect(applyTransform("nationality_normalize", "United States")).toBe("American")
    expect(applyTransform("nationality_normalize", "Canada")).toBe("Canadian")
  })
})

// ─── Nationality Normalize ──────────────────────────────────

describe("nationalityNormalize", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(nationalityNormalize(null)).toBe("")
    expect(nationalityNormalize(undefined)).toBe("")
    expect(nationalityNormalize("")).toBe("")
    expect(nationalityNormalize("  ")).toBe("")
  })

  it("converts country names to nationality adjectives", () => {
    expect(nationalityNormalize("United States")).toBe("American")
    expect(nationalityNormalize("united states")).toBe("American")
    expect(nationalityNormalize("USA")).toBe("American")
    expect(nationalityNormalize("Canada")).toBe("Canadian")
    expect(nationalityNormalize("Mexico")).toBe("Mexican")
    expect(nationalityNormalize("United Kingdom")).toBe("British")
    expect(nationalityNormalize("UK")).toBe("British")
    expect(nationalityNormalize("France")).toBe("French")
    expect(nationalityNormalize("Germany")).toBe("German")
    expect(nationalityNormalize("Japan")).toBe("Japanese")
    expect(nationalityNormalize("China")).toBe("Chinese")
    expect(nationalityNormalize("India")).toBe("Indian")
    expect(nationalityNormalize("Brazil")).toBe("Brazilian")
    expect(nationalityNormalize("Australia")).toBe("Australian")
    expect(nationalityNormalize("South Korea")).toBe("South Korean")
    expect(nationalityNormalize("Nigeria")).toBe("Nigerian")
  })

  it("passes through already-correct nationalities", () => {
    expect(nationalityNormalize("American")).toBe("American")
    expect(nationalityNormalize("Canadian")).toBe("Canadian")
    expect(nationalityNormalize("French")).toBe("French")
  })

  it("passes through unknown values", () => {
    expect(nationalityNormalize("Atlantean")).toBe("Atlantean")
    expect(nationalityNormalize("Some Place")).toBe("Some Place")
  })

  it("is case-insensitive", () => {
    expect(nationalityNormalize("UNITED STATES")).toBe("American")
    expect(nationalityNormalize("united kingdom")).toBe("British")
    expect(nationalityNormalize("JAPAN")).toBe("Japanese")
  })
})
