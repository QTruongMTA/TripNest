import { NextResponse, type NextRequest } from "next/server";
export function middleware(request: NextRequest) { void request; return NextResponse.next(); }
export const config = { matcher: ["/traveler/:path*", "/host/:path*", "/admin/:path*"] };

