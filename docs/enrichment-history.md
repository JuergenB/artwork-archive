# Enrichment Workflow History

## V0.4 (2026-03-09)
- Added SplitInBatches loop + Rate Limit Delay to fix Perplexity HTTP 429 errors
- Model: `sonar-deep-research`

## V0.5 (2026-03-09)
- Switched Perplexity from `sonar-deep-research` to `sonar-pro` (mistake — caused hallucinations)
- Enabled OpenAI JSON Schema strict mode on formatter
- Restructured formatter prompt with XML tags, primacy/recency
- Reduced formatter temp 0.4 → 0.2
- Added error handling (retry from Perplexity on failure)
- Added artwork SplitInBatches loop
- Renamed "GPT-4o-mini" → "GPT-4.1 Formatter"

## V0.6 (2026-03-09)
- **Root cause fix**: Switched back to `sonar-deep-research` — `sonar-pro` hallucinated citations
  - Evidence: Execution 7636 returned 8 Yayoi Kusama citations for Kirsten Bengtson-Lykoudis
  - Known Perplexity community issue with sonar-pro
- Added "Validate Citations" Code node (filters URLs by artist name/website relevance)
- Rewrote Perplexity prompt: removed fake `<Tools>` section, added citation accuracy constraints
- Increased Rate Limit Delay 15s → 30s, retry wait 15s → 30s
- Cleared all hallucinated AI fields from Airtable (6 artists, 2 artworks)

## V0.7 (2026-03-09)
- **Smart citation validation** — addresses common-name + gibberish submission problem (Elise Wilson case)
- Added **Pre-Process Submission** Code node:
  - Gibberish detection (lorem ipsum, placeholder patterns)
  - Identity anchor extraction (email domain, website domain, city/state)
  - Data quality score (0-10)
  - Conditional quality warnings passed to Perplexity prompt
- Improved **Perplexity prompt**:
  - New `<data_quality>` section with gibberish warnings
  - `<search_strategy>` reordered: website domain first, email domain second, then name+location
  - DISAMBIGUATION RULE for common names
  - Bio/statement conditionally replaced with "[Placeholder text - ignore]" when gibberish
- Replaced **Validate Citations** Code node with AI-powered Basic LLM Chain:
  - GPT-4o-mini (temp 0.1) evaluates each citation against artist identity context
  - Rejects wrong-person links, people-search sites, unrelated domains/countries
  - Structured output: verified_citations, removed_count, validation_notes, research_message
  - Cost: ~$0.001 per artist
- Updated **Formatter** user message to reference new output structure
- Key test case: Elise Wilson (lorem ipsum bio, artsvilleusa.com email, common name)

## Hallucination Incident Log
| Date | Artist | Issue | Model |
|------|--------|-------|-------|
| 2026-03-09 | Kirsten Bengtson | 8 Yayoi Kusama citations | sonar-pro |
| 2026-03-09 | Scott Power | Inaccurate profile, missing arterial.org, notrealart.com | sonar-pro |
| 2026-03-09 | Juergen Berkessel (recYrCuF2KM6OoQeT) | Yayoi Kusama summary | sonar-pro |
| 2026-03-09 | Elise Wilson | Yayoi Kusama summary | sonar-pro |
| 2026-03-09 | Elise Wilson | 16 wrong-person citations (Australian comedian, Mississippi university, etc.) despite correct model (sonar-deep-research). Caused by common name + lorem ipsum bio/statement. V0.6 Code node validator passed all of them. Fixed in V0.7 with AI-powered validator. | sonar-deep-research |
