# MCP-Orchestrated Multi-Agent Chatbot POC

A proof of concept demonstrating dynamic, LLM-driven multi-agent orchestration:

```
Natural Language -> Intent Detection -> LangGraph Orchestrator -> Task Planning
  -> MCP Tool Layer -> Correct Agent(s)/Tool(s) -> Repository/API -> Static JSON
  -> Result Aggregation -> Response Builder -> Chat UI
```

There is **no hardcoded `if/else` router**. OpenAI (via LangChain) detects structured
intents from the user's message, each intent is validated against an explicit
agent/tool registry, and a deterministic dependency planner turns the validated
intents into an execution plan that LangGraph runs — independent tasks in parallel,
dependent tasks in sequence.

## Architecture

- **Chat UI** (`components/chat/`, `app/page.tsx`) — plain React/Tailwind, no
  orchestration logic. Talks only to `POST /api/chat`.
- **Chat API** (`app/api/chat/route.ts`) — validates the request, invokes the graph,
  returns a structured response (`message`, `usedAgents`, `intents`, `uiActions`,
  optional `debug`).
- **LangGraph orchestrator** (`lib/graph/`) — typed state (`state.ts`), nodes for
  intent detection, planning, a scheduler/worker pair that dynamically fans
  independent tasks out in parallel via `Send()` while respecting `dependsOn`
  edges, aggregation, and response building.
- **MCP-style tool layer** (`lib/mcp/`) — a tool registry + agent registry +
  executor implementing the spec's `MCPToolDefinition` shape (name, description,
  domain, agent, Zod input/output schemas, handler). This is an in-process
  registry/executor modeled on MCP tool semantics, not a reimplementation of the
  MCP wire protocol (a single Next.js process has no cross-process boundary for
  that to cross).
- **Agents** (`lib/agents/{erp,onecatalog,onestore,faq}/`) — four independent
  domains (`ERP_AGENT`, `ONECATALOG_AGENT`, `ONESTORE_AGENT`, `FAQ_AGENT`). Agents
  never call each other; the orchestrator owns all coordination.
- **Repositories** (`lib/repositories/`) — `interfaces/` define the contract per
  domain; `api/*.ts` are the implementations agents actually use (HTTP calls to
  this app's own `/api/*` routes); `json/*.ts` are JSON-backed implementations used
  only by those route handlers. Swapping JSON for a real backend later means
  replacing `json/*.ts` behind the same interface — the agents, tools, and graph
  never change.
- **Static data** — the existing `erp_service.json`, `onecatalog_service.json`,
  `onestore_service.json`, `faq_service.json` at the project root are the only
  source of business data. Nothing else reads them directly except the four
  `lib/repositories/json/*.json-service.ts` files.
- **Interactive identity clarification** (`lib/graph/session/`, `lib/graph/nodes/identityGate.ts`) —
  order-status, credit-balance, and flyer-performance lookups never default to a
  demo customer. If the plan is missing an Order ID/Customer ID, the graph
  short-circuits straight to the response builder with a clarification question
  instead of running the tool. `app/api/chat/route.ts` keeps a small in-memory,
  per-`conversationId` session (`lib/graph/session/conversationStore.ts`) so the
  next message is interpreted as the answer (extracted deterministically, not via
  another LLM call — see `identifierExtraction.ts`) and remembered for later turns
  in the same conversation, without re-asking.

  There is no persistent auth/user session — `conversationId` is the only thread
  identity, matching the rest of this POC's "no database" scope.

## Known limitations

- **SKU namespaces don't cross-reference.** `erp_service.json`'s top-selling items
  use ERP-internal SKUs (e.g. `SKU-1001`) while `onestore_service.json` uses store
  SKUs (e.g. `WB-750`) for the same physical products. A query chaining
  "best-selling item" into an OneStore inventory check will therefore sometimes
  get a real (not fabricated) "no inventory record found" for that SKU — preserved
  deliberately rather than inventing a mapping the source data doesn't provide.
- **Clarification identifier extraction is regex-based**, tuned to this data's
  `CUST-#####` / `ORD-#####` formats plus a same-turn bare-token fallback when
  only one field is expected. A reply with neither a recognizable prefix nor a
  single bare token (e.g. "I don't remember it") is treated as unrecognized and
  the bot re-asks rather than guessing.

## Setup

```bash
yarn install
cp .env.example .env.local   # then fill in OPENAI_API_KEY
yarn dev                     # http://localhost:3000
```

Required env vars (`.env.local`, gitignored):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Commands

```bash
yarn dev      # dev server
yarn build    # production build (also type-checks)
yarn lint     # eslint
yarn test     # vitest — unit + orchestration integration tests, no OpenAI key required
```

## Example chatbot queries

- "What is my order status?" → asks "Which Order ID or Customer ID?" first; reply
  e.g. "ORD-78341" or "CUST-10234" to get the answer (single agent, `ERP_AGENT`)
- "Check my catalog credit balance" → asks for a Customer ID first, e.g. "CUST-10501"
  (single agent, `ONECATALOG_AGENT`); the ID is then remembered for the rest of
  that conversation, so a later "what about my best performing flyer?" won't ask again
- "Show me my top selling items and check my credit balance for CUST-10234." — parallel (`ERP_AGENT` + `ONECATALOG_AGENT`)
- "Find Bluetooth speakers under $30 and place an order for 50 units." — sequential (`searchProducts -> getInventory -> placeOrder`)
- "Find the best-selling product, check whether we have enough inventory, and tell me if I have enough catalog credits for CUST-10234." — mixed parallel/sequential across three agents
- "What is the minimum order quantity?" — `FAQ_AGENT` only, never `ONESTORE_AGENT`
- "I want to create a catalog" — shows a Create Catalog button; clicking it calls the POC confirmation endpoint directly (no orchestrator, no persistence)

Known-good test IDs from the sample data: customers `CUST-10234` (Rohan Sharma),
`CUST-10501` (Ayesha Khan), `CUST-10890` (David Fernandes); orders `ORD-78341`,
`ORD-78102`, `ORD-77654`, `ORD-79005`.

## Example API request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my order status?"}'
```

Response includes `message`, `conversationId`, `usedAgents`, `intents`, `uiActions`,
and an optional `debug` block (execution plan, per-task status, execution mode,
errors) — set `DISABLE_DEBUG_INFO=true` to omit `debug` in production. Pass the
returned `conversationId` back on the next request to continue the same
conversation (required for the identity-clarification follow-up to resolve, and
for the UI, which already does this automatically).
