import { LoginForm } from "@/components/login-form";

function safeCallbackUrl(value?: string) {
  if (!value) return "/";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 dark:bg-[#090909]">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
