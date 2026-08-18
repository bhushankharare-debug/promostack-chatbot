import { END, START, StateGraph } from "@langchain/langgraph";
import "@/lib/mcp/agentRegistry";
import { aggregateResultsNode } from "./nodes/aggregator";
import { routeAfterScheduler, runTaskNode, schedulerNode } from "./nodes/agentExecutor";
import { identityGateNode, routeAfterIdentityGate } from "./nodes/identityGate";
import { detectIntentNode } from "./nodes/intentDetection";
import { planTasksNode } from "./nodes/planner";
import { buildResponseNode } from "./nodes/responseBuilder";
import { ChatStateAnnotation, type ChatState } from "./state";

function understandQueryNode(state: ChatState) {
  console.log(`[CHAT] User query received: "${state.userQuery}"`);
  return {};
}

/**
 * Wires the graph described in the build spec:
 * START -> understand query -> detect intent(s) -> plan tasks -> identity
 * gate (asks for a missing Order/Customer ID instead of guessing, and
 * short-circuits straight to the response builder if so) ->
 * [scheduler <-> runTask loop, dynamically fanning independent tasks out
 * in parallel via Send() while respecting dependsOn edges] -> aggregate
 * results -> response builder -> END.
 */
export function buildChatbotGraph() {
  const graph = new StateGraph(ChatStateAnnotation)
    .addNode("understandQuery", understandQueryNode)
    .addNode("detectIntent", detectIntentNode)
    .addNode("planTasks", planTasksNode)
    .addNode("identityGate", identityGateNode)
    .addNode("scheduler", schedulerNode)
    .addNode("runTask", runTaskNode)
    .addNode("aggregate", aggregateResultsNode)
    .addNode("buildResponse", buildResponseNode)
    .addEdge(START, "understandQuery")
    .addEdge("understandQuery", "detectIntent")
    .addEdge("detectIntent", "planTasks")
    .addEdge("planTasks", "identityGate")
    .addConditionalEdges("identityGate", routeAfterIdentityGate, ["scheduler", "buildResponse"])
    .addConditionalEdges("scheduler", routeAfterScheduler, ["runTask", "scheduler", "aggregate"])
    .addEdge("runTask", "scheduler")
    .addEdge("aggregate", "buildResponse")
    .addEdge("buildResponse", END);

  return graph.compile();
}

type CompiledChatbotGraph = ReturnType<typeof buildChatbotGraph>;
let cachedGraph: CompiledChatbotGraph | null = null;

export function getChatbotGraph(): CompiledChatbotGraph {
  if (!cachedGraph) {
    cachedGraph = buildChatbotGraph();
  }
  return cachedGraph;
}
