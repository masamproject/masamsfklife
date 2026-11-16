import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/pano", "/liste", "/notlar", "/cop-kutusu"];
const AUTH_PAGES = ["/giris", "/kayit"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = !!getSessionCookie(req);

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasCookie) {
    return NextResponse.redirect(new URL("/giris", req.url));
  }
  if (AUTH_PAGES.includes(pathname) && hasCookie) {
    return NextResponse.redirect(new URL("/pano", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pano/:path*", "/liste/:path*", "/notlar/:path*", "/cop-kutusu/:path*", "/giris", "/kayit"],
};
