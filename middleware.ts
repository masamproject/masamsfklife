import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/gorevler", "/toplanti", "/projeler", "/dosyalar", "/arsiv", "/cop"];
const AUTH_PAGES = ["/giris", "/kayit"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = !!getSessionCookie(req);

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasCookie) {
    return NextResponse.redirect(new URL("/giris", req.url));
  }
  if (AUTH_PAGES.includes(pathname) && hasCookie) {
    return NextResponse.redirect(new URL("/gorevler", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/gorevler/:path*",
    "/toplanti/:path*",
    "/projeler/:path*",
    "/dosyalar/:path*",
    "/arsiv/:path*",
    "/cop/:path*",
    "/giris",
    "/kayit",
  ],
};
