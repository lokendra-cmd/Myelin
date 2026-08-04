import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthPage = pathname === "/login" || pathname === "/register";
      const isAuthApi = pathname.startsWith("/api/auth");

      if (isAuthApi) return true;

      if (!isLoggedIn) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (isAuthPage) return true;
        return false; // redirect to signIn page
      }

      if (isAuthPage) {
        return NextResponse.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        session.user.name = (token.name as string | undefined) || session.user.name || "";
        session.user.email = (token.email as string | undefined) || session.user.email || "";
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
} satisfies NextAuthConfig;
