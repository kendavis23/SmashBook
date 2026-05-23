_Last updated: 2026-05-23 00:00 UTC_

# Prompt Templates

System messages, user-prompt scaffolds, and few-shot examples for every Anthropic-served feature. Vertex AI features do not appear here (they consume structured features, not prompts).

## Conventions

- Keep system messages short, declarative, and free of "please." The model handles tone via the user prompt.
- Pin model identifiers at the call site, not in the prompt. Prompts here are model-agnostic.
- Include a `{{tenant_brand_voice}}` placeholder where copy is customer-facing. The voice profile is loaded from `tenants.brand_voice` (or a per-club override) and injected by `ai_inference_service` before the call.
- Never put tenant data inside the system message — only inside the user message. System messages should be cacheable across tenants.

## Template index

> One section per feature. Fill in as each ships.

### Smart notifications — booking confirmation
- System: _TBD_
- User template: _TBD_
- Few-shot examples: _TBD_

### Smart notifications — gap detection nudge
- System: _TBD_
- User template: _TBD_

### Campaign generation — re-engagement
- System: _TBD_
- User template: _TBD_

### Conversational booking
- System: _TBD_
- Tool definitions: _TBD_ (booking creation, availability check, etc.)
- User template: _TBD_

### AI support chatbot
- System: _TBD_
- Tool definitions: _TBD_ (ticket creation, escalation)
- User template: _TBD_

## Prompt caching

System messages are reused across thousands of calls per day. Use Anthropic prompt caching for any system message > 1024 tokens. Cache key is the system message itself; do not include tenant data in the cached portion.
