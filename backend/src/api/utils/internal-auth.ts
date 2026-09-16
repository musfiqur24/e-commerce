import { timingSafeEqual } from "crypto";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const INTERNAL_API_KEY_HEADER = "x-internal-api-key";

let warnedMissingKey = false;

function getHeader(req: MedusaRequest, name: string): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined> & {
    get?: (key: string) => string | null;
  };

  const value =
    typeof headers.get === "function"
      ? headers.get(name)
      : headers[name] || headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isLocalRequest(req: MedusaRequest): boolean {
  const host = getHeader(req, "host") || "";
  return (
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]:")
  );
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return (
    aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer)
  );
}

export function requireInternalApiKey(
  req: MedusaRequest,
  res: MedusaResponse,
): boolean {
  const expected =
    process.env.MEDUSA_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;

  if (!expected) {
    if (isLocalRequest(req)) {
      if (!warnedMissingKey) {
        console.warn(
          "[internal-auth] MEDUSA_INTERNAL_API_KEY is not set; allowing localhost request only.",
        );
        warnedMissingKey = true;
      }
      return true;
    }

    res.status(500).json({
      success: false,
      error: "Internal API key is not configured.",
    });
    return false;
  }

  const received = getHeader(req, INTERNAL_API_KEY_HEADER);
  if (!received || !safeCompare(received, expected)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return false;
  }

  return true;
}

