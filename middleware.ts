import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (required for SSR) and gate the admin area.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const isMfaRoute = pathname === "/mfa" || pathname.startsWith("/mfa/");

  if (isAdminRoute && !isLoginRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // TWO-STEP VERIFICATION — the single choke point.
  //
  // If this user has a VERIFIED authenticator but the session hasn't been
  // stepped up to aal2 yet, nothing behind the gate is reachable until they
  // pass the code. Enforcement is driven by the factor actually existing, so
  // it can never strand a user who hasn't enrolled: no factor, no challenge.
  // Only /mfa* and the login page are exempt.
  if (user && !isLoginRoute && !isMfaRoute) {
    const enrolled = (user.factors ?? []).some((f) => f.status === "verified");
    if (enrolled) {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa";
        url.search = "";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/account", "/mfa", "/mfa/:path*"],
};
