import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  // Cashfree can return to success URL using POST; convert it to a GET navigation.
  const redirectUrl = request.nextUrl.clone();
  return NextResponse.redirect(redirectUrl, 303);
}

export const config = {
  matcher: ["/profile/subscription/success"],
};

