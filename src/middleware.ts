import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type CookieUser = {
  $id?: string;
  email?: string;
  role?: string;
  departmentId?: string | null;
  isActive?: boolean;
};

function parseUser(cookie: string | undefined): CookieUser | null {
  if (!cookie) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookie));
    return parsed.state?.user ?? null;
  } catch {
    return null;
  }
}

async function hasAdminRemote(request: NextRequest): Promise<boolean> {
  try {
    const url = new URL("/api/bootstrap/has-admin", request.url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return true;
    const body = (await res.json()) as { hasAdmin?: boolean };
    return body.hasAdmin === true;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  if (path.startsWith("/api")) {
    return NextResponse.next();
  }

  if (path === "/register") {
    const closed = await hasAdminRemote(request);
    if (closed) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const authSession = request.cookies.get("auth-storage")?.value;
  const user = parseUser(authSession);
  const isAuthenticated =
    !!user?.$id && !!user?.email && !!user?.role && user?.isActive !== false;

  const isAuthPage = path === "/login" || path === "/register";

  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", path);
    return NextResponse.redirect(login);
  }

  if (path.startsWith("/admin") && user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
