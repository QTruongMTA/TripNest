import { NextRequest, NextResponse } from "next/server";

const primaryApiUrl =
  process.env.TRIPNEST_PRIMARY_API_URL ?? "http://localhost:5001/api/v1";
const fallbackApiUrl =
  process.env.TRIPNEST_FALLBACK_API_URL ?? "http://localhost:4567/api/v1";

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: {
    path?: string[];
  };
};

function buildTargetUrl(baseUrl: string, req: NextRequest, parts: string[]) {
  const target = new URL(`${baseUrl.replace(/\/+$/, "")}/${parts.join("/")}`);
  target.search = req.nextUrl.search;
  return target;
}

function buildHeaders(req: NextRequest) {
  const headers = new Headers(req.headers);

  for (const header of Array.from(hopByHopHeaders)) {
    headers.delete(header);
  }

  headers.delete("host");
  return headers;
}

async function proxyTo(
  baseUrl: string,
  req: NextRequest,
  parts: string[],
  body?: BodyInit
) {
  const response = await fetch(buildTargetUrl(baseUrl, req, parts), {
    method: req.method,
    headers: buildHeaders(req),
    body,
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers(response.headers);

  for (const header of Array.from(hopByHopHeaders)) {
    responseHeaders.delete(header);
  }

  responseHeaders.set("x-tripnest-upstream", baseUrl);

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function handle(req: NextRequest, context: RouteContext) {
  const parts = context.params.path ?? [];
  const canFallback = req.method === "GET" || req.method === "HEAD";
  const body = canFallback ? undefined : await req.arrayBuffer();

  try {
    const primaryResponse = await proxyTo(primaryApiUrl, req, parts, body);

    if (!canFallback || primaryResponse.status < 500) {
      return primaryResponse;
    }
  } catch {
    if (!canFallback) {
      return NextResponse.json(
        {
          error: {
            code: "PRIMARY_API_UNAVAILABLE",
            message: "TripNest primary backend is unavailable",
          },
        },
        { status: 503 }
      );
    }
  }

  try {
    return await proxyTo(fallbackApiUrl, req, parts);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "ALL_BACKENDS_UNAVAILABLE",
          message: "TripNest primary and fallback backends are unavailable",
        },
      },
      { status: 503 }
    );
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
