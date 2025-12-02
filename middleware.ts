import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_PATHS = ["/login"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const buildRedirectUrl = (request: NextRequest, pathname: string) => {
  const url = new URL(pathname, request.url);
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (redirectTarget && redirectTarget !== pathname) {
    url.searchParams.set("redirectTo", redirectTarget);
  }
  return url;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicRoute = isPublicPath(pathname);

  if (!user && !publicRoute) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icon.svg|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
