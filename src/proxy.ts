import { NextResponse, type NextRequest } from "next/server";

import { canReach, homeFor, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gates every /admin route behind a valid session cookie, and every page behind
 * the role that is allowed to see it. The login page is the only exception.
 *
 * This is defence in depth, not the only check — the dashboard layout and every
 * server action re-verify the session, and its role, before touching data. A
 * redirect here is a courtesy to whoever followed a stale link; the refusal
 * that matters happens next to the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Signed in, but not for this. Somewhere they can actually work rather than
  // a locked door with no handle.
  if (session && !canReach(session.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homeFor(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
