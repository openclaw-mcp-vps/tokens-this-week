import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, verifyAccessCookieValue } from "@/lib/access-cookie";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessCookieValue(token);

  if (session) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("paywall", "locked");

  const response = NextResponse.redirect(redirectUrl);

  if (token) {
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/api-keys/:path*"],
};
