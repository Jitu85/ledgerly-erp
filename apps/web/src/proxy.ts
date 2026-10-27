import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/inventory",
  "/purchases",
  "/sales",
  "/people",
  "/profile",
  "/about",
  "/platform",
];
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const authenticated = Boolean(request.cookies.get("erp_access_token")?.value);
  const path = request.nextUrl.pathname;
  if (!authenticated && protectedPaths.some((prefix) => path.startsWith(prefix))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", path);
    return NextResponse.redirect(login);
  }
  if (authenticated && authPaths.includes(path))
    return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/purchases/:path*",
    "/sales/:path*",
    "/about",
    "/people/:path*",
    "/profile/:path*",
    "/platform/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
