import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Rodriguez — Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/";
  return <LoginForm next={next} />;
}
