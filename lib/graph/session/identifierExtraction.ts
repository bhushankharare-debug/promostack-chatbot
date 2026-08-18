export interface ExtractedIdentifier {
  field: "orderId" | "customerId";
  value: string;
}

/**
 * Lightweight, regex-first parsing of a reply to a pending clarification
 * question (e.g. "Order ID is ORD12345", "CUST789", "my customer id is
 * CUST-10234"). Deliberately not an LLM call: the expected input is a
 * short, structured fragment, not a fresh natural-language request, and
 * keeping this deterministic avoids adding LLM latency/failure modes to
 * the most time-sensitive step of the clarification loop.
 */
export function extractIdentifier(
  message: string,
  acceptedFields: Array<"orderId" | "customerId">
): ExtractedIdentifier | null {
  const customerMatch = message.match(/CUST-?\s*(\d{3,})/i);
  if (customerMatch && acceptedFields.includes("customerId")) {
    return { field: "customerId", value: `CUST-${customerMatch[1]}` };
  }

  const orderMatch = message.match(/ORD-?\s*(\d{3,})/i);
  if (orderMatch && acceptedFields.includes("orderId")) {
    return { field: "orderId", value: `ORD-${orderMatch[1]}` };
  }

  // Only fall back to "the whole reply is the identifier" when there is a
  // single accepted field — with two accepted fields an unprefixed token is
  // genuinely ambiguous, and guessing which one it is would violate the
  // "never guess" requirement.
  const trimmed = message.trim();
  const isBareToken = trimmed.length >= 3 && !trimmed.includes(" ") && acceptedFields.length === 1;
  if (isBareToken) {
    return { field: acceptedFields[0], value: trimmed };
  }

  return null;
}
