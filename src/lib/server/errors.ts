/**
 * API error whose JSON body mirrors the shape the old NestJS
 * AllExceptionsFilter (and the Nuxt port) returned, so the frontend error
 * store keeps reading `error` from the response body.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
  ) {
    super(error);
    this.name = "ApiError";
  }
}

export function apiError(statusCode: number, error: string): ApiError {
  return new ApiError(statusCode, error);
}

export function apiErrorBody(err: ApiError, req?: Request) {
  return {
    statusCode: err.statusCode,
    error: err.error,
    path: req ? new URL(req.url).pathname : undefined,
    method: req?.method,
    timeStamp: new Date(),
  };
}
