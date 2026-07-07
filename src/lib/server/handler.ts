import { NextResponse } from "next/server";
import { dbConnect } from "./db";
import { ApiError, apiErrorBody } from "./errors";

/**
 * Wraps a Route Handler body: connects to MongoDB and converts ApiError
 * instances into the NestJS-compatible JSON error shape the client expects
 * (`{ statusCode, error, path, method, timeStamp }`).
 */
export async function handleApi(
  req: Request,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    await dbConnect();
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(apiErrorBody(err, req), {
        status: err.statusCode,
      });
    }
    console.error("[api] unhandled error:", err);
    const internal = new ApiError(500, "server_error");
    return NextResponse.json(apiErrorBody(internal, req), { status: 500 });
  }
}

export async function readJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
