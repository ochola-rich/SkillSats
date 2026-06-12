import { ZodError } from "zod";

const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 401,
  FORBIDDEN: 403,
  VIDEO_NOT_FOUND: 404,
  AD_NOT_FOUND: 404,
  PURCHASE_NOT_FOUND: 404,
  EMAIL_OR_USERNAME_TAKEN: 409,
  ALREADY_PURCHASED: 409,
  VIDEO_IS_FREE: 409,
  AD_BUDGET_EXHAUSTED: 409,
  INVOICE_AMOUNT_MISMATCH: 422,
  INSUFFICIENT_BALANCE: 422,
  COOLDOWN_ACTIVE: 429,
  LND_NOT_CONFIGURED: 503,
  LND_UNAVAILABLE: 503,
  LND_PAYMENT_FAILED: 502,
  SERVER_MISCONFIGURED: 500,
} as const;

type ErrorCode = keyof typeof ERROR_STATUS;

class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiRequestError(
      "INVALID_ORIGIN",
      403,
      "Cross-origin browser requests are not allowed.",
    );
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiRequestError("INVALID_JSON", 400, "Request body must be valid JSON.");
  }
}

export async function withApiErrors(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return errorResponse(error.code, error.message, error.status);
    }

    if (error instanceof ZodError) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed.",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "";
    const code = (Object.keys(ERROR_STATUS) as ErrorCode[]).find((candidate) =>
      message.includes(candidate),
    );
    if (code) {
      return errorResponse(code, humanizeErrorCode(code), ERROR_STATUS[code]);
    }

    console.error(error);
    return errorResponse("INTERNAL_ERROR", "An unexpected server error occurred.", 500);
  }
}

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function humanizeErrorCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
