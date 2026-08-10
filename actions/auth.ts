"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { registerSchema, signInSchema } from "@/lib/auth-schemas";
import { User } from "@/models/User";

export type AuthFormState = {
  error?: string;
  success?: string;
};

function safeCallbackUrl(value: string) {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.origin && value.startsWith(url.origin)) {
      return `${url.pathname}${url.search}` || "/";
    }
  } catch {
    // ignore invalid absolute URLs
  }
  return "/";
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email or password." };
  }

  const { email, password } = parsed.data;
  const callbackUrl = safeCallbackUrl(String(formData.get("callbackUrl") ?? "/"));

  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user?.passwordHash) {
      return { error: "Invalid email or password." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }
  } catch {
    return { error: "Could not reach the database. Please try again." };
  }

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // Successful Auth.js sign-in may still throw a Next.js redirect error
    // depending on version; only rethrow non-auth failures after redirect:false.
    const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: string }).digest) : "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Sign-in failed. Please try again." };
  }

  redirect(callbackUrl);
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password } = parsed.data;

  try {
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });
  } catch {
    return { error: "Could not create account. Please try again." };
  }

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    const digest = typeof error === "object" && error && "digest" in error ? String((error as { digest?: string }).digest) : "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Account created, but sign-in failed. Try logging in." };
  }

  redirect("/");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
