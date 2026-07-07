"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/Brand";

export function AdminNav({ email }: { email: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/admin", label: "Tournois" },
    { href: "/admin/historique", label: "Historique" },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-brume bg-blanc/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/admin" className="shrink-0">
          <Brand compact />
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              l.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-nuage text-encre"
                    : "text-ardoise hover:bg-nuage hover:text-encre"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="ml-1 rounded-lg px-3 py-2 text-sm font-medium text-ardoise transition hover:bg-nuage hover:text-encre"
            title={email ?? undefined}
          >
            Déconnexion
          </button>
        </nav>
      </div>
    </header>
  );
}
