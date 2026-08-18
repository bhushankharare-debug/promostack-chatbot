import type { ChatState, ChatStateUpdate } from "../state";

/**
 * LangGraph node: collects/logs the final set of successful and failed task
 * results before handoff to the response builder. Kept as its own step so
 * "what happened" (aggregation) stays distinct from "how do we phrase it"
 * (response generation) — both results and errors are already accumulated
 * in state via the agentResults/errors reducers, so this node's job is to
 * make that collection point explicit and observable.
 */
export async function aggregateResultsNode(state: ChatState): Promise<ChatStateUpdate> {
  console.log(
    `[AGGREGATOR] ${state.agentResults.length} result(s) collected, ${state.errors.length} error(s) recorded`
  );
  return {};
}
