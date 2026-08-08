import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const isUnlocked = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isUnlockPath = request.nextUrl.pathname.startsWith("/unlock");

  if (!isUnlocked && !isUnlockPath) {
    const unlockUrl = request.nextUrl.clone();
    unlockUrl.pathname = "/unlock";
    unlockUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(unlockUrl);
  }

  if (isUnlocked && isUnlockPath) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/dashboard";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|icon|apple-icon|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
