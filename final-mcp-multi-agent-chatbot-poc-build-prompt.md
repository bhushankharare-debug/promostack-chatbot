# MCP-Orchestrated Multi-Agent Chatbot POC --- Complete Build Prompt

## 1. Role and Objective

You are an expert full-stack TypeScript engineer with strong experience
in:

-   Next.js
-   TypeScript
-   React
-   LangChain
-   LangGraph
-   OpenAI
-   MCP (Model Context Protocol)
-   Zod
-   API design
-   Agent orchestration
-   Clean architecture
-   Automated testing

Build a complete **Multi-Agent Chatbot Proof of Concept (POC)** based on
the attached architecture diagram and the requirements in this document.

The primary objective is to prove this end-to-end flow:

``` text
Natural Language User Query
        |
        v
Next.js Chat UI
        |
        v
Chat API
        |
        v
NLU / Intent Detection
        |
        v
LangGraph Orchestrator
        |
        v
MCP Tool Layer
        |
        +----------------------------------------------+
        |            |            |            |
        v            v            v            v
 OneCatalog       ERP        OneStore       FAQ
   Agent         Agent         Agent        Agent
        |            |            |
        v            v            v
      APIs that fetch data from static JSON
        |
        v
Result Aggregator
        |
        v
Response Builder
        |
        v
Next.js Chat UI
        |
        v
User
```

The system must support:

1.  Single-agent requests.
2.  Multi-agent requests.
3.  Parallel execution for independent tasks.
4.  Sequential execution for dependent tasks.
5.  Strongly typed tools and schemas.
6.  Dynamic agent/tool selection using LLM-based intent detection and
    planning.
7.  Explicit registration and validation of all available agents and
    tools.
8.  Static JSON as the initial data source.
9.  APIs that fetch data from the JSON files.
10. A clean architecture that can later replace JSON-backed APIs with
    real APIs without redesigning the orchestrator.

This is a **POC**, so do not introduce unnecessary production
infrastructure.

------------------------------------------------------------------------

# 2. Important Corrections to the Original Architecture

There are two important corrections that must be followed throughout the
implementation.

## Correction 1 --- Agents must access data through APIs

Do **not** make agents directly read JSON files.

The architecture should be:

``` text
Agent
  |
  v
MCP Tool
  |
  v
Repository / Service
  |
  v
API
  |
  v
Static JSON
```

For the POC, create internal API endpoints that fetch/read the static
JSON data.

The agent/tool layer should consume the API abstraction rather than
importing JSON files directly.

The goal is that later the API implementation can be changed from:

``` text
API -> JSON
```

to:

``` text
API -> Real ERP / OneCatalog / OneStore / FAQ service
```

without changing the LangGraph orchestration design.

Keep the data access implementation isolated.

## Correction 2 --- `createCatalog()` is a UI action, not an AI data operation

If the user wants to create a catalog, do **not** make the LLM or agent
actually create or modify catalog data.

For the POC:

-   The chatbot can identify that the user wants to create a catalog.
-   The response should indicate that catalog creation is available.
-   The UI should display a **Create Catalog** button.
-   When the user clicks the button, simply show a confirmation message
    such as:

``` text
Catalog created successfully.
```

No database write is required.

No real catalog creation API is required for this POC.

Do not invent catalog creation business logic.

------------------------------------------------------------------------

# 3. Architecture Mapping

Map every major component from the diagram to the code architecture.

## 3.1 Chat Interface

Diagram component:

``` text
1. Chat Interface
```

Implementation:

-   Next.js App Router
-   React
-   TypeScript

Responsibilities:

-   Display conversation
-   Accept user input
-   Send requests to `/api/chat`
-   Display assistant responses
-   Display loading state
-   Display errors
-   Display optional POC execution/debug information
-   Display a **Create Catalog** button when the response indicates that
    catalog creation requires user action

The UI must not contain orchestration logic.

------------------------------------------------------------------------

# 4. NLU and Intent Detection

Diagram component:

``` text
2. NLU & Intent Detection
```

Create a dedicated LangGraph node for intent detection.

Use OpenAI through LangChain.

The intent detector should:

-   Understand the natural-language request.
-   Detect one or more intents.
-   Extract relevant entities.
-   Identify the likely domain.
-   Identify the appropriate registered agent capability.
-   Produce structured output.
-   Validate the output using Zod.

Do not rely on a large hardcoded keyword matcher.

Do not allow the LLM to arbitrarily invoke tools.

Only registered capabilities may be selected.

Example:

User:

``` text
What is my order status?
```

Structured intent:

``` json
{
  "intents": [
    {
      "intent": "GET_ORDER_STATUS",
      "domain": "ERP",
      "agent": "ERP_AGENT"
    }
  ]
}
```

Another example:

``` text
Show me my top selling items and check my credit balance.
```

Expected intents:

``` json
{
  "intents": [
    {
      "intent": "TOP_BEST_SELLING_ITEMS",
      "domain": "ERP",
      "agent": "ERP_AGENT"
    },
    {
      "intent": "CHECK_CREDIT_BALANCE",
      "domain": "ONE_CATALOG",
      "agent": "ONECATALOG_AGENT"
    }
  ]
}
```

The exact intent names may be adjusted if a better naming scheme is
required, but the domain separation and routing behavior must remain
clear.

------------------------------------------------------------------------

# 5. LangGraph Orchestrator

Diagram component:

``` text
3. MCP Orchestrator
(Agent Controller)
```

Use **LangGraph as the primary orchestration and state-management
layer**.

The orchestrator is responsible for:

-   Deciding which agent(s) are needed.
-   Planning tasks.
-   Selecting registered tools.
-   Determining dependencies.
-   Determining parallel versus sequential execution.
-   Passing context between dependent tasks.
-   Executing tools through MCP.
-   Collecting results.
-   Handling failures.
-   Aggregating results.
-   Sending results to the response builder.

Agents must never coordinate with other agents.

The graph should conceptually look like:

``` text
START
  |
  v
Understand User Query
  |
  v
Detect Intent(s)
  |
  v
Plan Tasks
  |
  v
Validate Available Capabilities
  |
  v
Determine Dependencies
  |
  +-------------------------+
  |                         |
  v                         v
Independent Tasks       Dependent Tasks
  |                         |
  v                         v
Parallel Execution      Sequential Execution
  |                         |
  +------------+------------+
               |
               v
        Execute Tools
               |
               v
      Collect Agent Results
               |
               v
       Aggregate Results
               |
               v
       Response Builder
               |
               v
              END
```

------------------------------------------------------------------------

# 6. Typed LangGraph State

Create a strongly typed LangGraph state.

The exact design may be improved if LangGraph recommends a better
pattern, but the state should contain information equivalent to:

``` ts
interface ChatState {
  userQuery: string;
  conversationId?: string;
  messages?: unknown[];
  intents: Intent[];
  entities: Record<string, unknown>;
  executionPlan: ExecutionPlan[];
  agentResults: AgentResult[];
  errors: AgentError[];
  finalResponse?: string;
  debug?: DebugExecution;
}
```

Use proper TypeScript types.

Do not use `any` unless absolutely unavoidable.

Use Zod schemas for runtime validation where appropriate.

The state must carry dependent task results so later tasks can consume
required context.

------------------------------------------------------------------------

# 7. Agent Registry

Create an explicit agent registry.

The orchestrator should discover capabilities from the registry instead
of hardcoding every tool inside the main graph.

Conceptually:

``` text
Agent Registry
 |
 +-- ONECATALOG_AGENT
 |      |
 |      +-- createCatalog
 |      +-- checkCreditBalance
 |      +-- fetchBestPerformingFlyer
 |
 +-- ERP_AGENT
 |      |
 |      +-- getErpOrder
 |      +-- getCustomer
 |      +-- getPricing
 |      +-- getOrderStatus
 |      +-- getTopSellingItems
 |
 +-- ONESTORE_AGENT
 |      |
 |      +-- searchProducts
 |      +-- getInventory
 |      +-- placeOrder
 |
 +-- FAQ_AGENT
        |
        +-- getFaqAnswer
             |
             +-- FAQ_SERVICE / faq_service.json
```

The exact `getTopSellingItems()` tool may be added to the ERP capability
set because it is required by the example workflows.

Each registered tool must contain:

-   Name
-   Description
-   Input schema
-   Output schema
-   Handler
-   Owning domain
-   Owning agent

Adding a future agent should require registration rather than rewriting
the core orchestrator.

------------------------------------------------------------------------

# 8. OneCatalog Agent

Create:

``` text
OneCatalog Agent
```

Responsibilities:

-   Catalog-related operations
-   Catalog information
-   Credit balance
-   Flyer-related information

Initial capabilities:

``` text
createCatalog()
checkCreditBalance()
fetchBestPerformingFlyer()
```

## createCatalog behavior

`createCatalog()` must **not** modify persistent data.

For the POC, the chatbot should identify the catalog creation request
and the frontend should show a button.

Example:

``` text
Assistant:
You can create a catalog using the button below.

[Create Catalog]
```

When the user clicks:

``` text
Catalog created successfully.
```

The click can be implemented as a frontend action or a simple dedicated
POC endpoint if preferred.

No database is required.

## Other OneCatalog tools

`checkCreditBalance()` and `fetchBestPerformingFlyer()` should fetch
information through the API/data-access abstraction.

Do not hardcode business data inside the agent.

------------------------------------------------------------------------

# 9. ERP Agent

Create:

``` text
ERP Agent
```

Responsibilities:

-   ERP order information
-   Customer information
-   Pricing
-   Operational/order status
-   Best-selling item information

Initial tools:

``` text
getErpOrder()
getCustomer()
getPricing()
getOrderStatus()
getTopSellingItems()
```

These tools must obtain data through the appropriate API abstraction
backed by static JSON.

The agent must not directly import or manipulate JSON files.

------------------------------------------------------------------------

# 10. OneStore Agent

Create:

``` text
OneStore Agent
```

Responsibilities:

-   Product discovery
-   Inventory
-   Orders
-   Product information

Initial tools:

``` text
searchProducts()
getInventory()
placeOrder()
```

For the POC, these operations use APIs backed by static JSON.

`placeOrder()` should be implemented according to the available mock
data and POC constraints. Do not introduce a database.

If the provided JSON does not support a real order mutation, return an
appropriate mock/POC result rather than inventing persistent business
behavior.

------------------------------------------------------------------------

# 12. FAQ Agent / FAQ Service

Create a dedicated **FAQ Agent** as an independent service/domain. FAQ functionality
must **not** be owned by, implemented inside, or registered under the OneStore
Agent.

The supplied `faq_service.json` is the initial source for this capability. It
contains a dedicated FAQ service with the `get_faq_answer` action and FAQ
categories covering ordering, samples, imprint methods, artwork, pricing,
production, shipping, returns, payment, and company-store programs. fileciteturn0file1L2-L24

Create:

``` text
FAQ Agent
```

Responsibilities:

-   Answer general FAQ questions.
-   Search/match FAQ content from `faq_service.json`.
-   Return the best matching FAQ answer and relevant metadata.
-   Keep FAQ data access isolated behind an FAQ repository/service interface.

Initial capability:

``` text
getFaqAnswer()
```

The canonical tool/action represented by the supplied JSON is:

``` text
get_faq_answer
```

The implementation may expose a TypeScript-friendly `getFaqAnswer()` wrapper,
but the MCP/tool metadata should preserve the source action identity where
useful.

The FAQ Agent must use its own API/data-access path:

``` text
FAQ Agent
  |
  v
FAQ MCP Tool
  |
  v
FAQ Repository / Service
  |
  v
FAQ API
  |
  v
faq_service.json
```

Do **not** route FAQ requests through OneStore.

Do **not** place `getFaqAnswer()` in `onestore/tools.ts`.

Do **not** create `/api/onestore/faq`.

Use a dedicated FAQ endpoint such as:

``` text
GET /api/faq
POST /api/faq
```

Choose the HTTP method based on the final implementation, but keep the FAQ
service boundary independent from OneStore.

The FAQ JSON contains 37 FAQ records and categories including Ordering Basics,
Samples & Product Evaluation, Product & Imprint Questions, Artwork & Proofs,
Pricing & Quotes, Production & Turnaround Times, Shipping & Delivery, Changes,
Cancellations & Returns, Payment & Billing, and Company Stores & Programs.
Use those actual records as the initial POC data rather than inventing a
second FAQ dataset. fileciteturn0file1L14-L24 fileciteturn0file1L26-L42

The FAQ service must remain independently replaceable later with a real FAQ
service/API without changing LangGraph orchestration.

------------------------------------------------------------------------

# 13. MCP Layer

Create an MCP-style abstraction between LangGraph and the domain
capabilities.

The conceptual architecture is:

``` text
LangGraph Orchestrator
          |
          v
      MCP Layer
          |
    +------+------+------+------+
    |      |      |      |
    v      v      v      v
OneCatalog ERP  OneStore  FAQ
 Tools   Tools   Tools   Tools
```

Create clear abstractions for:

-   MCP Tool Definition
-   MCP Tool Registry
-   MCP Tool Executor
-   Tool validation
-   Tool ownership
-   Tool input/output schemas
-   Tool errors

Conceptually:

``` ts
type MCPToolDefinition = {
  name: string;
  description: string;
  domain: string;
  agent: string;
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  handler: (...args: unknown[]) => Promise<unknown>;
};
```

Use the current compatible MCP SDK/API approach if an actual MCP SDK is
used.

Do not fake an incompatible MCP implementation merely to match an API
name.

The important architectural requirement is that the orchestration layer
communicates with explicitly registered, validated MCP-style
capabilities.

Adding a new agent should involve:

1.  Creating the agent.
2.  Creating its tools.
3.  Defining schemas.
4.  Registering its tools.
5.  Registering its repository/API capability.

It should not require rewriting the core graph.

------------------------------------------------------------------------

# 14. Repository and API Architecture

Use a clean data-access architecture.

The corrected POC flow is:

``` text
Agent
  |
  v
Domain Tool
  |
  v
Repository / Service Interface
  |
  v
API Client / Internal API
  |
  v
Static JSON
```

Do not make the agent directly depend on the JSON files.

The repository/service interface should hide the source of the data.

For example:

``` ts
interface ERPRepository {
  getOrderStatus(input: GetOrderStatusInput): Promise<GetOrderStatusOutput>;
  getCustomer(input: GetCustomerInput): Promise<GetCustomerOutput>;
  getPricing(input: GetPricingInput): Promise<GetPricingOutput>;
  getTopSellingItems(
    input: GetTopSellingItemsInput
  ): Promise<GetTopSellingItemsOutput>;
}
```

Then provide a JSON/API-backed implementation.

Later, the implementation can be replaced with:

``` text
ERPRepository
    |
    v
Real ERP API
```

without changing the agent or LangGraph graph.

------------------------------------------------------------------------

# 15. API Layer for JSON Data

Create APIs that fetch data from the static JSON files.

Suggested internal API routes:

``` text
/api/onecatalog/...
/api/erp/...
/api/onestore/...
/api/faq/...
```

The exact route names can be improved, but domain separation must remain
clear.

Examples:

``` text
GET /api/erp/order-status
GET /api/erp/top-selling-items
GET /api/erp/customer
GET /api/erp/pricing

GET /api/onecatalog/credit-balance
GET /api/onecatalog/best-performing-flyer

GET /api/onestore/products
GET /api/onestore/inventory

GET /api/faq
```

For operations that are only UI POC actions, such as catalog creation, a
simple endpoint may be used if useful, but no persistent database write
is required.

The actual JSON schema will be provided later.

Therefore, do not make assumptions about the final business data
structure.

------------------------------------------------------------------------

# 16. Static JSON Data

The project already contains the initial JSON service files:

``` text
erp_service.json
faq_service.json
onecatalog_service.json
onestore_service.json
```

Treat these files as the authoritative initial POC data sources.

Do **not** create replacement/mock JSON files unless an explicitly required
file is genuinely missing.

The `faq_service.json` file is a separate FAQ service/data source. It must
never be merged into `onestore_service.json` or exposed as OneStore data.

Requirements:

-   Inspect the actual JSON structure before implementing schemas or mappings.
-   Isolate JSON parsing/mapping in the API/repository/service layer.
-   Do not hardcode business data in agents.
-   Do not hardcode business data in the orchestrator.
-   Keep each domain's data source isolated.
-   Preserve the service boundaries so the JSON-backed implementation can later
    be replaced by a real API.

Recommended logical data boundaries:

``` text
ERP_SERVICE      -> erp_service.json
FAQ_SERVICE      -> faq_service.json
ONECATALOG_SERVICE -> onecatalog_service.json
ONESTORE_SERVICE -> onestore_service.json
```

The application architecture must not depend directly on the internal JSON
shape outside the corresponding repository/service implementation.

------------------------------------------------------------------------

# 17. Task Planning

The planner must convert detected intents into executable tasks.

Example:

User:

``` text
Show me my top selling items and my credit balance.
```

Execution plan:

``` text
Task 1
Agent: ERP_AGENT
Tool: getTopSellingItems()

Task 2
Agent: ONECATALOG_AGENT
Tool: checkCreditBalance()
```

These tasks are independent.

Execution mode:

``` text
PARALLEL
```

Another example:

``` text
Find Bluetooth speakers under ₹5,000 and place an order for 50 units.
```

Expected dependency:

``` text
searchProducts()
       |
       v
select matching product
       |
       v
getInventory()
       |
       v
placeOrder()
```

This must be sequential because later operations require information
from earlier operations.

The planner should represent dependencies explicitly.

Do not simply execute all detected tools in sequence.

Do not simply execute all detected tools in parallel.

------------------------------------------------------------------------

# 18. Parallel Execution

When tasks are independent, execute them concurrently.

Example:

``` text
User Query
    |
    v
Task Planner
    |
    +-------------------+
    |                   |
    v                   v
ERP Agent          OneCatalog Agent
    |                   |
    v                   v
getTopSellingItems() checkCreditBalance()
    |                   |
    +---------+---------+
              |
              v
        Aggregate Results
```

Use appropriate async/concurrent execution.

The graph should not introduce unnecessary sequential waits.

If one independent agent fails, other independent tasks should still be
allowed to complete.

------------------------------------------------------------------------

# 19. Sequential Execution

When task B depends on task A, preserve the dependency.

Example:

``` text
searchProducts()
       |
       v
select matching product
       |
       v
getInventory()
       |
       v
placeOrder()
```

The graph state must carry the relevant result from one step to the
next.

For example:

``` text
searchProducts()
    -> selectedProductId
    -> getInventory(selectedProductId)
    -> placeOrder(selectedProductId, quantity)
```

The exact implementation should depend on the actual JSON data once
provided.

------------------------------------------------------------------------

# 20. Multi-Agent Dependent Workflow

The orchestrator must support workflows where different agents depend on
previous results.

Example:

``` text
Find the best-selling product, check whether we have enough inventory,
and tell me if I have enough catalog credits.
```

Possible execution:

``` text
ERP Agent
    |
    +-- getTopSellingItems()
            |
            v
OneStore Agent
    |
    +-- getInventory()
            |
            +-------------------+
                                |
                                v
                         Aggregator

OneCatalog Agent
    |
    +-- checkCreditBalance()
            |
            +-------------------+
                                |
                                v
                         Aggregator
```

However, if the catalog-credit check is independent of the ERP/OneStore
tasks, it should run in parallel.

The planner must determine dependencies based on actual task
inputs/outputs.

------------------------------------------------------------------------

# 21. Response Builder

Create a dedicated response-builder node.

Responsibilities:

-   Combine agent results.
-   Summarize results.
-   Remove unnecessary technical details.
-   Resolve duplicate information.
-   Handle partial failures.
-   Generate a clear natural-language response.
-   Keep the response relevant to the original user query.
-   Avoid exposing internal orchestration details unless debug mode is
    enabled.

Example input:

``` json
{
  "erp": {
    "topSellingItems": [
      "Product A",
      "Product B",
      "Product C"
    ]
  },
  "oneCatalog": {
    "creditBalance": 1250
  }
}
```

Expected response:

``` text
Your top-selling products are:

1. Product A
2. Product B
3. Product C

Your current catalog credit balance is 1,250 credits.
```

------------------------------------------------------------------------

# 22. Partial Failure Handling

Do not fail the entire request when independent agents fail.

Example:

``` text
ERP Agent -> FAILED

OneCatalog Agent -> SUCCESS
```

The aggregator should preserve both results:

``` text
ERP = failed
OneCatalog = success
```

The response builder should produce something like:

``` text
I was able to retrieve your catalog credit balance,
but I couldn't retrieve the ERP information.
```

Handle failures at:

1.  Intent detection
2.  Planning
3.  MCP tool validation
4.  MCP tool execution
5.  Agent execution
6.  API calls
7.  JSON data access
8.  Response generation

Errors should be typed where practical.

------------------------------------------------------------------------

# 23. OpenAI Integration

Use OpenAI through LangChain/LangGraph.

Create a dedicated module for OpenAI configuration.

Do not initialize OpenAI clients throughout the codebase.

Use:

``` env
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=
```

Never commit secrets.

Use structured output for:

-   Intent detection
-   Planning where appropriate
-   Response generation where appropriate

Prefer:

``` text
LLM
 |
 v
Structured Schema
 |
 v
Zod Validation
 |
 v
Typed Object
```

over parsing unreliable free-form strings.

The LLM may recommend capabilities, but the registry and validation
layer must remain authoritative.

------------------------------------------------------------------------

# 24. Tool Calling Rules

Every tool must be strongly typed.

Each tool must define:

-   Tool name
-   Description
-   Input schema
-   Output schema
-   Handler
-   Owning domain
-   Owning agent

Example:

``` ts
const getOrderStatusInput = z.object({
  orderId: z.string().optional(),
});
```

Do not finalize exact business fields until the real JSON data is
provided.

The tool schemas may initially be placeholders and should be easy to
update.

------------------------------------------------------------------------

# 25. Dynamic Routing Requirement

The most important architectural requirement is:

**Do not implement the chatbot as a large collection of hardcoded
`if/else` statements for every user query.**

The system should dynamically determine:

``` text
User Query
    |
    v
LLM Intent Detection
    |
    v
Validated Intent
    |
    v
Capability Registry
    |
    v
Task Planner
    |
    v
Agent + Tool Selection
    |
    v
MCP Execution
```

Hardcoded registration/configuration of capabilities is acceptable.

Hardcoded natural-language routing for every possible question is not.

For example, do not build:

``` ts
if (message.includes("order")) {
  // ERP
}

if (message.includes("credit")) {
  // OneCatalog
}
```

Instead, use structured LLM output and validate it against registered
capabilities.

------------------------------------------------------------------------

# 26. Next.js Architecture

Use the modern Next.js App Router.

Suggested structure:

``` text
src/
  app/
    page.tsx

    api/
      chat/
        route.ts

      onecatalog/
        ...

      erp/
        ...

      onestore/
        ...

      faq/
        ...

  components/
    chat/
      ChatWindow.tsx
      ChatMessage.tsx
      ChatInput.tsx
      ExecutionDetails.tsx
      CreateCatalogButton.tsx

  lib/
    ai/
      openai.ts

    graph/
      chatbot.graph.ts
      state.ts

      nodes/
        intentDetection.ts
        planner.ts
        dependencyResolver.ts
        agentExecutor.ts
        aggregator.ts
        responseBuilder.ts

    mcp/
      registry/
        toolRegistry.ts
        agentRegistry.ts

      executor/
        mcpToolExecutor.ts

      types/
        tool.ts

    agents/
      onecatalog/
        agent.ts
        tools.ts
        schemas.ts

      erp/
        agent.ts
        tools.ts
        schemas.ts

      onestore/
        agent.ts
        tools.ts
        schemas.ts

      faq/
        agent.ts
        tools.ts
        schemas.ts

    repositories/
      interfaces/
        onecatalog.repository.ts
        erp.repository.ts
        onestore.repository.ts

      api/
        onecatalog.api.ts
        erp.api.ts
        onestore.api.ts
        faq.api.ts

      json/
        ...

    schemas/
      intent.ts
      executionPlan.ts
      agentResult.ts
      agentError.ts
      tool.ts

  data/
    onecatalog/
      data.json

    erp/
      data.json

    onestore/
      data.json
```

You may improve the exact structure, but maintain clear separation
between:

-   UI
-   API
-   LangGraph
-   MCP
-   Agents
-   Tools
-   Repositories
-   Static data

------------------------------------------------------------------------

# 27. Chat API

Create:

``` text
POST /api/chat
```

Request:

``` json
{
  "message": "What is my order status?"
}
```

Response should be structured.

Example:

``` json
{
  "message": "Your order is currently being processed.",
  "conversationId": "conversation-id",
  "usedAgents": [
    "ERP_AGENT"
  ],
  "intents": [
    "GET_ORDER_STATUS"
  ]
}
```

For POC debugging, optionally include:

``` json
{
  "message": "...",
  "conversationId": "...",
  "usedAgents": [],
  "intents": [],
  "debug": {
    "executionPlan": [],
    "agents": [],
    "tools": [],
    "executionMode": "parallel",
    "errors": []
  }
}
```

The frontend should primarily display `message`.

------------------------------------------------------------------------

# 28. Conversation State

Use LangGraph state for the current execution.

Support:

-   conversationId
-   userQuery
-   previous messages
-   detected intents
-   extracted entities
-   execution plan
-   dependency information
-   agent results
-   errors
-   final response

Do not introduce a database.

Use in-memory state or a simple POC mechanism.

Design interfaces so persistent conversation storage can be added later.

------------------------------------------------------------------------

# 29. Frontend

Create a clean, responsive chatbot interface.

Conceptually:

``` text
+---------------------------------------+
|          Multi-Agent Chatbot          |
+---------------------------------------+
|                                       |
| User: What is my order status?        |
|                                       |
| AI: Your order is currently...        |
|                                       |
|                                       |
+---------------------------------------+
| Type your message...           [Send] |
+---------------------------------------+
```

Support:

-   User messages
-   Assistant messages
-   Loading state
-   Error state
-   Enter-to-send
-   Disable send while processing
-   Responsive design
-   Optional execution details
-   Create Catalog button when required

Keep UI independent from orchestration logic.

------------------------------------------------------------------------

# 30. Create Catalog UI Behavior

When the user asks:

``` text
Create a catalog.
```

The system should not perform a real catalog creation operation.

Expected flow:

``` text
User
 |
 v
Intent Detection
 |
 v
ONECATALOG_AGENT / createCatalog capability
 |
 v
Response
 |
 v
UI shows:
"Click the button below to create the catalog."

[Create Catalog]
```

When the user clicks:

``` text
[Create Catalog]
```

Show:

``` text
Catalog created successfully.
```

No database write is required.

Do not invent a catalog ID, database record, or persistent state unless
explicitly requested later.

------------------------------------------------------------------------

# 31. Streaming

For the initial POC, standard request/response is acceptable.

Structure the code so streaming can be added later.

Do not allow streaming complexity to block the core architecture.

The graph and API should not be tightly coupled to a non-streaming
response format.

------------------------------------------------------------------------

# 32. Logging and Debugging

Add useful server-side logs.

Example:

``` text
[CHAT]
User query received

[INTENT]
Detected intents:
- GET_ORDER_STATUS

[PLANNER]
Selected:
- ERP_AGENT
- getOrderStatus

[MCP]
Executing getOrderStatus

[ERP]
Tool completed successfully

[AGGREGATOR]
1 result collected

[RESPONSE]
Final response generated
```

Do not log:

-   API keys
-   Secrets
-   Sensitive credentials
-   Unnecessary personal data

------------------------------------------------------------------------

# 33. POC Debug Information

Expose optional execution details.

Example:

``` json
{
  "message": "...",
  "debug": {
    "intents": [],
    "executionPlan": [],
    "agents": [],
    "tools": [],
    "executionMode": "parallel",
    "errors": []
  }
}
```

The UI can have a small:

``` text
Show execution details
```

section.

Make debug information easy to disable for production.

------------------------------------------------------------------------

# 34. Required Example Workflows

The architecture must support the following examples.

## Example 1 --- Single Agent

User:

``` text
What is my order status?
```

Expected:

``` text
Intent:
GET_ORDER_STATUS

Agent:
ERP_AGENT

Tool:
getOrderStatus()
```

Flow:

``` text
User
 -> Intent Detection
 -> LangGraph
 -> MCP
 -> ERP Agent
 -> getOrderStatus()
 -> Aggregator
 -> Response Builder
 -> User
```

The request must not invoke OneCatalog or OneStore unnecessarily.

------------------------------------------------------------------------

## Example 2 --- Multi-Agent Parallel

User:

``` text
Show me my top selling items and check my credit balance.
```

Expected:

``` text
ERP_AGENT
 -> getTopSellingItems()

ONECATALOG_AGENT
 -> checkCreditBalance()
```

These tasks are independent.

Execution:

``` text
PARALLEL
```

Then:

``` text
Aggregate
 -> Response Builder
 -> User
```

------------------------------------------------------------------------

## Example 3 --- OneStore Sequential

User:

``` text
Find Bluetooth speakers under ₹5,000 and place an order for 50 units.
```

Expected conceptual flow:

``` text
searchProducts()
       |
       v
select matching product
       |
       v
getInventory()
       |
       v
placeOrder()
```

The exact behavior must depend on the available JSON/API data.

Do not invent fields that are not supported by the eventual data.

------------------------------------------------------------------------

## Example 4 --- Multi-Agent Workflow

User:

``` text
Find the best-selling product, check whether we have enough inventory,
and tell me if I have enough catalog credits.
```

Possible capabilities:

``` text
ERP_AGENT
 -> getTopSellingItems()

OneStore Agent
 -> getInventory()

OneCatalog Agent
 -> checkCreditBalance()
```

The planner must determine whether the tasks are independent or whether
later tasks require earlier results.

Independent tasks should run in parallel.

Dependent tasks should run sequentially.

------------------------------------------------------------------------

## Example 5 --- Independent FAQ Service

User:

``` text
What is the minimum order quantity?
```

Expected routing:

``` text
FAQ_AGENT
  -> getFaqAnswer()
  -> FAQ API
  -> faq_service.json
```

The request must **not** invoke:

``` text
OneStore Agent
ERP Agent
OneCatalog Agent
```

FAQ is a first-class domain capability. It must be independently registered,
validated, executed, and aggregated like the other agents.

------------------------------------------------------------------------

# 35. Validation and Safety of Tool Selection

The LLM must not be trusted as the sole source of truth for tool
availability.

Use this process:

``` text
LLM
 |
 v
Structured Intent / Plan
 |
 v
Zod Validation
 |
 v
Agent Registry
 |
 v
Tool Registry
 |
 v
Capability Validation
 |
 v
MCP Tool Executor
```

If the LLM requests a nonexistent tool, reject it cleanly.

Return a useful error rather than executing arbitrary code.

------------------------------------------------------------------------

# 36. Error Handling Requirements

Handle:

### Intent detection failure

Return a user-friendly response and log the internal error.

### Planning failure

Do not execute unvalidated tools.

### Unknown tool

Reject the plan.

### Invalid tool input

Validate with Zod and return a structured tool error.

### API failure

Capture the failure in the agent result.

### JSON parsing/data failure

Return a typed repository/data error.

### Agent failure

Allow independent agents to continue.

### Response builder failure

Return a safe fallback response.

------------------------------------------------------------------------

# 37. Testing

Create tests for at least:

1.  Single intent.
2.  Multiple independent intents.
3.  Multiple dependent intents.
4.  Correct agent selection.
5.  Correct tool selection.
6.  Parallel execution.
7.  Sequential execution.
8.  Agent failure.
9.  Tool failure.
10. Invalid intent.
11. Unknown request.
12. Empty query.
13. Malformed JSON data.
14. Catalog creation button flow.
15. FAQ routing to `FAQ_AGENT` and `getFaqAnswer()`.
16. FAQ isolation: FAQ requests must not invoke `OneStore Agent`.
17. Unknown/unregistered tool request.

Example assertion:

``` text
"What is my order status?"
```

must invoke:

``` text
ERP_AGENT
 -> getOrderStatus()
```

It must not invoke:

``` text
OneCatalog
OneStore
```

Another assertion:

``` text
"What is the minimum order quantity?"
```

must invoke:

``` text
FAQ_AGENT
 -> getFaqAnswer()
```

It must not invoke:

``` text
OneStore Agent
```

Another assertion:

``` text
"Check my catalog credit balance"
```

must invoke:

``` text
ONECATALOG_AGENT
 -> checkCreditBalance()
```

------------------------------------------------------------------------

# 38. Unit and Integration Test Boundaries

Create tests around clear boundaries.

Recommended unit tests:

-   Intent schema validation.
-   Plan validation.
-   Tool registry.
-   Agent registry.
-   MCP tool executor.
-   Repository/API clients.
-   Dependency resolution.
-   Parallel executor.
-   Sequential executor.
-   Aggregator.

Integration tests:

-   Chat API → LangGraph.
-   LangGraph → MCP.
-   MCP → Agent tool.
-   Agent tool → API.
-   API → JSON.
-   Full example workflows.

Do not require a real OpenAI API key for every unit test.

Mock the LLM where appropriate.

------------------------------------------------------------------------

# 39. Coding Standards

Use:

-   TypeScript strict mode.
-   Strong typing.
-   Zod validation.
-   Async/await.
-   Small reusable functions.
-   Clean separation of concerns.
-   Meaningful names.
-   Clear error handling.
-   Environment variables for secrets.
-   No unnecessary `any`.
-   No duplicated orchestration logic.
-   No business logic inside UI components.
-   No business logic directly inside API route handlers when it belongs
    in services/graph nodes.
-   No direct JSON imports inside agents.
-   No direct agent-to-agent communication.

Do not put the entire application into one file.

------------------------------------------------------------------------

# 40. Dependencies

Use current stable/compatible versions of the required libraries.

Core technologies:

``` text
Next.js
TypeScript
React
LangChain
LangGraph
OpenAI integration
Zod
MCP-compatible SDK/abstraction
```

Before implementing an actual MCP SDK integration, verify the current
compatible API and use the supported approach.

Do not create an obsolete MCP implementation based on outdated examples.

Keep dependencies minimal because this is a POC.

------------------------------------------------------------------------

# 41. Environment Variables

Use:

``` env
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=
```

Add any additional environment variables only if actually required.

Never commit `.env` secrets.

Provide:

``` text
.env.example
```

with empty placeholders.

------------------------------------------------------------------------

# 42. Do Not Overengineer

This is a POC.

Do NOT introduce:

-   PostgreSQL
-   Redis
-   Kafka
-   Kubernetes
-   Microservices
-   Authentication
-   Multi-tenancy
-   Complex event buses
-   Production deployment infrastructure

unless specifically required later.

The primary objective is proving:

``` text
Natural Language
      ↓
Intent Detection
      ↓
LangGraph Planning
      ↓
MCP
      ↓
Correct Agent(s)
      ↓
Correct Tool(s)
      ↓
API
      ↓
Static JSON
      ↓
Aggregate
      ↓
LLM Response
```

------------------------------------------------------------------------

# 43. Future Extensibility

The architecture should make it easy to add:

-   New Agent
-   New Tool
-   New Domain
-   Real API
-   Database
-   Authentication
-   Multi-tenancy
-   Persistent conversations
-   Streaming
-   Human approval
-   Additional MCP servers/capabilities

For example, adding:

``` text
Marketing Agent
```

should not require modifying:

``` text
OneCatalog Agent
ERP Agent
OneStore Agent
FAQ Agent
```

The new agent should be registered with the capability registry.

------------------------------------------------------------------------

# 44. Existing JSON Data and Future API Replacement

The project already contains the initial service JSON files, including the
dedicated `faq_service.json`.

The implementation must use the existing files as the initial POC data source.
Do not build a second mock dataset when the corresponding service file exists.

Before implementing each repository, API client, tool schema, or agent:

1. Inspect the corresponding JSON file.
2. Determine the actual fields, identifiers, records, and supported actions.
3. Map those structures behind the repository/service boundary.
4. Validate tool inputs/outputs against the actual supported data.
5. Keep unsupported business operations isolated behind a clear POC/service
   boundary rather than inventing persistent behavior.

For FAQ specifically:

``` text
FAQ Agent
    |
    v
FAQ Tool
    |
    v
FAQ Repository / Service
    |
    v
/api/faq
    |
    v
faq_service.json
```

For OneStore:

``` text
OneStore Agent
    |
    v
OneStore Tool
    |
    v
OneStore Repository / Service
    |
    v
/api/onestore/*
    |
    v
onestore_service.json
```

These are separate service boundaries. `faq_service.json` must not be loaded
or interpreted as part of the OneStore service.

When real production APIs become available later, replace the relevant
repository/API implementation without changing the LangGraph orchestration,
agent registry, or high-level MCP contracts unless the real API genuinely
requires a contract change.

# 45. Suggested Project Structure

Use this as a baseline:

``` text
project-root/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   │
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts
│   │       │
│   │       ├── onecatalog/
│   │       │   └── ...
│   │       │
│   │       ├── erp/
│   │       │   └── ...
│   │       │
│   │       ├── onestore/
│   │       │   └── ...
│   │       └── faq/
│   │           └── ...
│   │
│   ├── components/
│   │   └── chat/
│   │       ├── ChatWindow.tsx
│   │       ├── ChatMessage.tsx
│   │       ├── ChatInput.tsx
│   │       ├── ExecutionDetails.tsx
│   │       └── CreateCatalogButton.tsx
│   │
│   └── lib/
│       ├── ai/
│       │   └── openai.ts
│       │
│       ├── graph/
│       │   ├── chatbot.graph.ts
│       │   ├── state.ts
│       │   └── nodes/
│       │       ├── intentDetection.ts
│       │       ├── planner.ts
│       │       ├── dependencyResolver.ts
│       │       ├── agentExecutor.ts
│       │       ├── aggregator.ts
│       │       └── responseBuilder.ts
│       │
│       ├── mcp/
│       │   ├── registry/
│       │   │   ├── toolRegistry.ts
│       │   │   └── agentRegistry.ts
│       │   │
│       │   ├── executor/
│       │   │   └── mcpToolExecutor.ts
│       │   │
│       │   └── types/
│       │       └── tool.ts
│       │
│       ├── agents/
│       │   ├── onecatalog/
│       │   │   ├── agent.ts
│       │   │   ├── tools.ts
│       │   │   └── schemas.ts
│       │   │
│       │   ├── erp/
│       │   │   ├── agent.ts
│       │   │   ├── tools.ts
│       │   │   └── schemas.ts
│       │   │
│       │   ├── onestore/
│       │   │   ├── agent.ts
│       │   │   ├── tools.ts
│       │   │   └── schemas.ts
│       │   │
│       │   └── faq/
│       │       ├── agent.ts
│       │       ├── tools.ts
│       │       └── schemas.ts
│       │
│       ├── repositories/
│       │   ├── interfaces/
│       │   │   ├── onecatalog.repository.ts
│       │   │   ├── erp.repository.ts
│       │   │   └── onestore.repository.ts
│       │   │
│       │   └── api/
│       │       ├── onecatalog.api.ts
│       │       ├── erp.api.ts
│       │       ├── onestore.api.ts
│       │       └── faq.api.ts
│       │
│       └── schemas/
│           ├── intent.ts
│           ├── executionPlan.ts
│           ├── agentResult.ts
│           ├── agentError.ts
│           └── tool.ts
│
├── data/
│   ├── onecatalog/
│   │   └── data.json
│   │
│   ├── erp/
│   │   └── data.json
│   │
│   ├── onestore/
│   │   └── data.json
│   └── faq/
│       └── data.json
│
├── tests/
│   ├── intent/
│   ├── planner/
│   ├── mcp/
│   ├── agents/
│   ├── orchestration/
│   └── api/
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

The structure may be adjusted if there is a strong architectural reason.

------------------------------------------------------------------------

# 46. Required Implementation Phases

Build the POC incrementally in the following exact order.

## Phase 1 --- Project Setup

Create:

-   Next.js application.
-   TypeScript strict configuration.
-   Required dependencies.
-   Environment configuration.
-   `.env.example`.
-   Base folder structure.

Explain why each dependency is required.

------------------------------------------------------------------------

## Phase 2 --- Architecture and Typed State

Create:

-   LangGraph state.
-   Intent types.
-   Entity types.
-   Execution plan types.
-   Agent result types.
-   Error types.
-   Debug information types.

Make the state capable of representing single, parallel, and sequential
workflows.

------------------------------------------------------------------------

## Phase 3 --- Intent Detection

Implement:

-   OpenAI configuration.
-   LangChain LLM.
-   Structured intent schema.
-   Zod validation.
-   Intent detection graph node.

Test:

``` text
What is my order status?
```

and:

``` text
Show me my top selling items and check my credit balance.
```

------------------------------------------------------------------------

## Phase 4 --- Agent Registry

Implement:

-   Agent definitions.
-   Agent registry.
-   Capability discovery.
-   Tool metadata.

The registry must be the source of truth for available capabilities.

------------------------------------------------------------------------

## Phase 5 --- MCP Tool Abstraction

Implement:

-   Tool definition.
-   Tool registry.
-   Tool executor.
-   Input validation.
-   Output validation.
-   Ownership validation.
-   Error handling.

Make the abstraction modular enough to integrate with the appropriate
MCP SDK/transport later if required.

------------------------------------------------------------------------

## Phase 6 --- OneCatalog Agent

Implement:

``` text
createCatalog()
checkCreditBalance()
fetchBestPerformingFlyer()
```

Important:

`createCatalog()` must result in a UI button/confirmation flow rather
than a real database mutation.

------------------------------------------------------------------------

## Phase 7 --- ERP Agent

Implement:

``` text
getErpOrder()
getCustomer()
getPricing()
getOrderStatus()
getTopSellingItems()
```

Use API-backed JSON access.

------------------------------------------------------------------------

## Phase 8 --- OneStore Agent

Implement:

``` text
searchProducts()
getInventory()
placeOrder()
```

Use API-backed JSON access.

------------------------------------------------------------------------

## Phase 9 --- FAQ Agent / FAQ Service

Implement the FAQ capability as an independent service/domain.

Use the existing:

``` text
faq_service.json
```

Create the corresponding:

``` text
FAQ Agent
FAQ MCP Tool
FAQ Repository / Service
FAQ API
```

Implement:

``` text
getFaqAnswer()
```

The FAQ capability must not be implemented in the OneStore agent or exposed
through `/api/onestore/faq`.

Use:

``` text
FAQ Agent
    ->
FAQ Tool
    ->
FAQ Repository / Service
    ->
/api/faq
    ->
faq_service.json
```

Before finalizing schemas, inspect the supplied JSON and preserve the actual
FAQ service/action structure.

------------------------------------------------------------------------

## Phase 10 --- Parallel and Sequential Orchestration

Implement:

-   Task dependency resolution.
-   Parallel execution.
-   Sequential execution.
-   Context passing.
-   Independent failure handling.

Test both modes.

------------------------------------------------------------------------

## Phase 11 --- Aggregation and Response Builder

Implement:

-   Result aggregation.
-   Duplicate handling.
-   Partial failure handling.
-   LLM response generation.
-   User-friendly final responses.

------------------------------------------------------------------------

## Phase 12 --- Next.js Chat API

Implement:

``` text
POST /api/chat
```

Connect the API to the LangGraph workflow.

Return structured response data.

------------------------------------------------------------------------

## Phase 13 --- Chat UI

Implement:

-   Chat window.
-   Input.
-   Send button.
-   Loading.
-   Error state.
-   Enter-to-send.
-   Assistant messages.
-   Execution details.
-   Create Catalog button.

------------------------------------------------------------------------

## Phase 14 --- Existing JSON/API Integration

Use the existing service JSON files; do not create replacement mock data.

Expose the domain API routes, including the dedicated FAQ route.

Verify:

``` text
FAQ Agent -> FAQ Tool -> FAQ Repository/Service -> /api/faq -> faq_service.json
OneStore Agent -> OneStore Tool -> OneStore Repository/Service -> /api/onestore/* -> onestore_service.json
```

Ensure:

``` text
Agent -> Tool -> Repository/Service -> API -> JSON
```

rather than:

``` text
Agent -> JSON
```

------------------------------------------------------------------------

## Phase 15 --- End-to-End Tests

Test all required examples and failure scenarios.

------------------------------------------------------------------------

# 47. Acceptance Criteria

The POC is complete only when all of the following are true.

### Architecture

-   Next.js UI is separate from backend orchestration.
-   LangGraph owns execution state and workflow.
-   MCP layer owns tool registration/execution abstraction.
-   Agents own domain capabilities.
-   Agents do not call other agents.
-   APIs provide access to JSON-backed data.
-   Repositories/services isolate data access.
-   Response builder is separate from agent execution.
-   FAQ is a first-class domain with its own agent, tool registry entries,
    repository/service, API route, and `faq_service.json` data source.
-   OneStore owns only OneStore capabilities; it does not own FAQ lookup.

### Dynamic Routing

-   User intent is detected using an LLM.
-   Structured output is validated.
-   Available tools are discovered through the registry.
-   The orchestrator dynamically selects appropriate agents/tools.
-   There is no giant natural-language `if/else` router.

### Execution

-   Single-agent requests work.
-   Multi-agent requests work.
-   Independent tasks execute in parallel.
-   Dependent tasks execute sequentially.
-   Context is passed between dependent tasks.
-   Independent failures do not unnecessarily fail the whole request.

### MCP

-   Tools have metadata.
-   Tools have Zod input schemas.
-   Tools have output validation where appropriate.
-   Tools have domain/agent ownership.
-   Tool execution is centralized.
-   Unknown/unregistered tools are rejected.

### Data

-   Agents do not directly read JSON.
-   APIs fetch JSON-backed data.
-   Data mapping is isolated.
-   `faq_service.json` is accessed through the FAQ service boundary.
-   No `/api/onestore/faq` route exists.
-   No `getFaqAnswer()`/FAQ tool is registered under OneStore.
-   Real JSON can be integrated later without redesigning the
    orchestration layer.

### UI

-   Chat works.
-   Loading state works.
-   Error state works.
-   Enter-to-send works.
-   Create Catalog button works.
-   Catalog creation only displays the POC confirmation and does not
    require a database.

### Testing

-   Required workflow tests exist.
-   Parallel execution is tested.
-   Sequential execution is tested.
-   Failure handling is tested.
-   Invalid tool selection is tested.

------------------------------------------------------------------------

# 48. Expected Final Deliverables

Provide the implementation incrementally.

For each phase:

1.  Explain what is being built.
2.  Show the relevant files.
3.  Provide complete code for those files.
4.  Explain how the files connect.
5.  Explain how to run/test the phase.
6.  Do not skip important implementation details.
7.  Do not place the entire application in a single file.
8.  Keep code production-quality while avoiding unnecessary production
    infrastructure.

At the end, provide:

-   Complete project structure.
-   Installation commands.
-   Environment setup.
-   Run commands.
-   Test commands.
-   Example API requests.
-   Example chatbot queries.
-   Architecture explanation.
-   Explanation of how the real JSON files can be integrated later.

------------------------------------------------------------------------

# 49. Final Non-Negotiable Requirements

The following requirements are mandatory:

1.  **Use Next.js + TypeScript.**
2.  **Use LangChain.**
3.  **Use LangGraph for orchestration/state.**
4.  **Use OpenAI for natural-language understanding.**
5.  **Use an MCP-compatible tool abstraction/layer.**
6.  **Use Zod for validation.**
7.  **Create OneCatalog, ERP, OneStore, and FAQ agents.**
8.  **Treat `faq_service.json` as an independent FAQ service/data source.
    FAQ tools must not be part of the OneStore agent, OneStore tool registry,
    or OneStore API.**
9.  **Agents must not directly call other agents.**
11.  **The orchestrator owns all coordination.**
12. **Support single-agent execution.**
13. **Support multi-agent execution.**
14. **Support parallel execution.**
15. **Support sequential execution.**
16. **Use APIs to fetch data from static JSON.**
17. **Agents must not directly import JSON data.**
18. **Keep data access isolated behind repository/service interfaces.**
19. **Do not assume the final JSON schema because the real JSON will be
    provided later.**
20. **Do not use a database for this POC.**
21. **Do not introduce unnecessary infrastructure.**
22. **Do not use a giant hardcoded `if/else` routing system.**
23. **Use a registry for agents and tools.**
24. **Validate LLM-selected capabilities against the registered
    capabilities.**
25. **Handle partial failures.**
26. **Expose optional debug/execution information.**
27. **For catalog creation, show a UI button and then display a simple
    success message when clicked; do not implement real persistence.**
28. **Keep the architecture extensible for future APIs, databases,
    authentication, persistence, streaming, and additional agents.**
The final architecture must clearly demonstrate:

``` text
Natural Language
       ↓
Intent Detection
       ↓
LangGraph Orchestrator
       ↓
Task Planning
       ↓
MCP Tool Layer
       ↓
Correct Agent(s)
       ↓
Correct Tool(s)
       ↓
API
       ↓
Static JSON
       ↓
Result Aggregation
       ↓
Response Builder
       ↓
Next.js UI
```

This architecture, rather than a collection of hardcoded examples, is
the primary success criterion for the POC.



## IMPORTANT: Existing Project Files and Reference Assets

The project directory already contains the following JSON service/data files. **These files are available and must be treated as the actual initial data source for the POC. Do not create replacement/mock JSON files unless a file is genuinely missing. `faq_service.json` is a separate FAQ service and must not be merged into or treated as part of `onestore_service.json`.**

Available JSON files:

- `erp_service.json`
- `faq_service.json`
- `onecatalog_service.json`
- `onestore_service.json`

The implementation must inspect and understand the actual structure of these JSON files before creating repository methods, schemas, tool input/output mappings, or agent logic.

### JSON Access Rule

The agents/tools should **not directly read the JSON files from the UI or orchestration layer**.

Use an API/data-access flow such as:

```text
Next.js Chat API
      |
      v
LangGraph Orchestrator
      |
      v
MCP Tool
      |
      v
Domain Agent / Tool Handler
      |
      v
Repository / API Service
      |
      +-------------------------------+
      |        |        |             |
      v        v        v             v
   OneCatalog ERP   OneStore        FAQ
     API      API      API          API
      |        |        |             |
      +--------+--------+-------------+
                       |
                       v
                 Existing JSON files
```

The JSON files are the source data for the POC, while the application should expose/access that data through clean API/service or repository boundaries.

Do not tightly couple the LangGraph orchestrator to the JSON file structure.

### Existing Reference Architecture Image

The project directory also contains:

- `reference image.png`

This image is the **reference architecture/flow diagram** for the chatbot POC.

The implementation must use this image as a visual reference for the major system components and flow:

1. Chat Interface
2. NLU & Intent Detection
3. MCP Orchestrator
4. MCP Communication Layer
5. OneCatalog Agent
6. ERP Agent
7. OneStore Agent
8. FAQ Agent
9. Response Builder
10. Static JSON data

The final implementation should remain consistent with the architecture shown in `reference image.png`, while following the detailed requirements in this prompt.

### Existing Project Directory

The current project already contains files/folders such as:

```text
chatbot_poc/
├── app/
├── public/
├── erp_service.json
├── faq_service.json
├── onecatalog_service.json
├── onestore_service.json
├── reference image.png
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── README.md
├── AGENTS.md
├── CLAUDE.md
└── ...
```

**Do not unnecessarily recreate the project from scratch.**

First inspect the existing project structure, `package.json`, configuration files, JSON files, and `reference image.png`. Then implement the requested architecture into the existing project.

### Catalog Creation Correction

For `createCatalog()`:

- This is a POC action.
- Do not implement a real catalog creation backend/database operation.
- When the user requests catalog creation, the UI should provide/show a **Create Catalog button** where appropriate.
- When the user clicks the button, show a confirmation message such as:
  **"Catalog is created successfully."**
- Do not persist the catalog to a database.
- Keep this behavior isolated so a real catalog-creation API can be introduced later.

### Critical Implementation Instruction

Before writing implementation code, inspect the existing JSON files and determine what operations they actually support.

Do not assume the JSON schema from the examples in this prompt.

The examples such as `getOrderStatus()`, `getPricing()`, `searchProducts()`, `getInventory()`, `checkCreditBalance()`, `getFaqAnswer()`, etc. describe the intended capabilities, but the **actual field names, structures, identifiers, and available records must be derived from the existing JSON files**.

If an intended capability cannot be supported by the existing JSON data, clearly isolate it behind an interface/service boundary and provide an appropriate POC response rather than inventing business data.

For FAQ specifically, use `faq_service.json` as the authoritative initial FAQ
source. Do not move, duplicate, merge, or expose its records through the
OneStore service. The FAQ service must remain independently replaceable with a
real FAQ API/service later.

OPENAI_API_KEY=<your-openai-api-key>
GOOGLE_API_KEY=<your-google-api-key>
HUGGINGFACEHUB_API_TOKEN=<your-huggingface-token>

