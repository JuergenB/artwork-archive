# JSON Schema Strict Mode on lmChatOpenAi

When you need the LLM to output guaranteed valid JSON, add `textFormat` to the `options`:

```json
{
  "model": {
    "__rl": true, "value": "gpt-4.1", "mode": "list", "cachedResultName": "gpt-4.1"
  },
  "options": {
    "temperature": 0.2,
    "maxTokens": 4000,
    "timeout": 150000,
    "textFormat": {
      "textOptions": {
        "type": "json_schema",
        "name": "your_schema_name",
        "description": "Description of the output",
        "schema": "{...JSON schema as string...}",
        "strict": true
      }
    }
  }
}
```

The `schema` value is a stringified JSON Schema — same format as `outputParserStructured.inputSchema`.

This is used on the GPT-4.1 Formatter in the Enrichment workflow to guarantee valid JSON at the API level (not relying on prompt instructions alone).
