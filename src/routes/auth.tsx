import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/SiteHeader";
import { useShop } from "@/lib/shop";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Sidi Outfits" },
      { name: "description", content: "Sign in to book and track your Sidi Outfits orders." },
      { property: "og:title", content: "Sign in — Sidi Outfits" },
      { property: "og:description", content: "Sign in to book and track your orders." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safe(redirect);
  const navigate = useNavigate();
  const { session } = useShop();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: target as "/" });
  }, [session, target, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + target },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm, then come back to book.");
    }
    setBusy(false);
  };

  const google = async () => {
    sessionStorage.setItem("sidi-after-auth", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth?redirect=" + encodeURIComponent(target) });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-plum px-4 py-10">
      <div className="w-full max-w-sm rounded-md bg-background p-7">
        <div className="text-center">
          <Logo className="text-5xl" />
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "in" ? "Welcome back." : "Create your account to book."}
          </p>
        </div>
        <button onClick={google} className="mt-6 w-full rounded-full border py-3 text-sm font-medium hover:bg-secondary">
          Continue with Google
        </button>
        <div className="eyebrow my-5 text-center text-muted-foreground">or</div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
          <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
          <button disabled={busy} className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
