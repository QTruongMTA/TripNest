import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("portal_token")?.value
    ?? request.headers.get("x-portal-token");

  // Login page: đã có token thì không cần đăng nhập lại
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Protected routes: chuyển hướng về login nếu chưa xác thực
  // Xác thực thật sự xảy ra ở client (SessionBootstrap + authStore)
  // Middleware chỉ làm fast-redirect nếu không có cookie
  if ((pathname.startsWith("/admin") || pathname.startsWith("/operator")) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operator/:path*", "/login"],
};
