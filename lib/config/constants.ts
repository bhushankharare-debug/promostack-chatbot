/**
 * POC-only stand-in for an authenticated caller. There is no auth layer in
 * this proof of concept, so first-person queries ("what is my order
 * status?") resolve against this fixed demo customer. A real deployment
 * would replace this with the customer ID from the authenticated session.
 */
export const DEFAULT_CUSTOMER_ID = "CUST-10234";

/**
 * Base URL used by server-side repository clients to call this app's own
 * internal API routes. Route handlers run on the server, so relative fetch()
 * URLs are not resolvable — an absolute base is required.
 */
export function getInternalApiBaseUrl(): string {
  if (process.env.INTERNAL_API_BASE_URL) {
    return process.env.INTERNAL_API_BASE_URL;
  }
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}
