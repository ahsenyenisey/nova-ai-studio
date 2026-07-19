"use client";

import { motion } from "framer-motion";
import { Boxes, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { EASE_CINEMATIC } from "@/lib/motion";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  {
    href: "/studio",
    label: "Veri Yükle",
    icon: Upload,
    match: (p) => p === "/studio" || p.startsWith("/studio/eda") || p.startsWith("/studio/train"),
  },
  {
    href: "/studio/models",
    label: "Modeller",
    icon: Boxes,
    match: (p) => p.startsWith("/studio/models") || p.startsWith("/studio/predict"),
  },
];

/** Sol ikon navigasyon rayı — hover'da genişler (CLAUDE.md yerleşimi). */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen">
      <motion.nav
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => setExpanded(false)}
        animate={{ width: expanded ? 208 : 64 }}
        transition={{ duration: 0.3, ease: EASE_CINEMATIC }}
        className="fixed inset-y-0 left-0 z-30 flex flex-col gap-2 overflow-hidden border-r border-border-glow bg-bg-nebula/80 py-5 backdrop-blur-xl"
      >
        {/* NOVA logosu → landing */}
        <Link
          href="/"
          className="mb-4 flex h-10 items-center gap-3 px-4 font-bold tracking-[0.02em] text-text-primary"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border-glow bg-surface-glass text-primary">
            N
          </span>
          <motion.span
            animate={{ opacity: expanded ? 1 : 0 }}
            className="whitespace-nowrap text-lg"
          >
            NOVA
          </motion.span>
        </Link>

        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "relative flex h-11 items-center gap-3 px-4 text-sm transition-colors " +
                (active
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-primary")
              }
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                />
              ) : null}
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <motion.span
                animate={{ opacity: expanded ? 1 : 0 }}
                className="whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </motion.nav>

      <div className="pl-16">{children}</div>
    </div>
  );
}
