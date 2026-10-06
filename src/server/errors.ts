export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string, readonly details?: unknown) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`, "NOT_FOUND");
export const forbidden = (msg = "You do not have permission to perform this action") =>
  new HttpError(403, msg, "FORBIDDEN");
export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, "BAD_REQUEST", details);
