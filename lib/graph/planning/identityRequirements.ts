import type { ToolName } from "@/lib/schemas/tool";

export interface IdentityRequirement {
  /** Any one of these fields being present (from entities or conversation memory) satisfies the requirement. */
  acceptedFields: Array<"orderId" | "customerId">;
  question: string;
}

/**
 * Declarative registration of which lookups require the bot to know who/what
 * it's looking up before it may run — never silently default to a demo
 * customer. This is capability metadata (registration data, explicitly
 * allowed by the build spec), not natural-language routing: it never
 * inspects the user's message, only which tool a task targets.
 */
export const IDENTITY_REQUIREMENTS: Partial<Record<ToolName, IdentityRequirement>> = {
  getOrderStatus: {
    acceptedFields: ["orderId", "customerId"],
    question: "Sure — could you provide the Order ID or Customer ID for the order you'd like me to check?",
  },
  checkCreditBalance: {
    acceptedFields: ["customerId"],
    question: "Sure — could you provide your Customer ID so I can check the credit information?",
  },
  fetchBestPerformingFlyer: {
    acceptedFields: ["customerId"],
    question: "Sure — could you provide your Customer ID so I can look up your flyer performance?",
  },
};
