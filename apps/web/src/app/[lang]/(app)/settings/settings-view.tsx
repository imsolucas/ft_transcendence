"use client";

import { useState, useSyncExternalStore } from "react";
import { Database, KeyRound, LogOut, Shield, SlidersHorizontal, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Tab, TabPanel, Tabs, TabsList } from "@/components/ui/primitives";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { ApiKeysSection } from "./api-keys-section";
import { PreferencesSection } from "./preferences-section";
import { DataSection } from "./data-section";

const SECTIONS = [
  { id: "profile", key: "settings.sections.profile", icon: User },
  { id: "security", key: "settings.sections.security", icon: Shield },
  { id: "api-keys", key: "settings.sections.apiKeys", icon: KeyRound },
  { id: "preferences", key: "settings.sections.preferences", icon: SlidersHorizontal },
  { id: "data", key: "settings.sections.data", icon: Database },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];
const PANEL = "rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** The selected section lives in the URL hash so other pages can deep-link (#security…). */
function useSection(): SectionId {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  return SECTIONS.some((s) => s.id === hash) ? (hash as SectionId) : "profile";
}

export function SettingsView() {
  const { t, href } = useI18n();
  const section = useSection();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await authClient.signOut();
    // full load: leaves no signed-in data in client caches
    window.location.assign(href("/"));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 md:gap-6">
      <h1 className="pix pix-md uppercase">{t("settings.title")}</h1>
      <Tabs value={section} onValueChange={(v) => (window.location.hash = v)} activationMode="manual">
        <TabsList className="mb-4 overflow-x-auto md:hidden" aria-label={t("settings.sectionsNav")}>
          {SECTIONS.map((s) => (
            <Tab key={s.id} value={s.id} className="flex-1 !px-2">
              {t(s.key)}
            </Tab>
          ))}
        </TabsList>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
          <nav className="hidden flex-col gap-1 md:flex" aria-label={t("settings.sectionsNav")}>
            {SECTIONS.map(({ id, key, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={section === id ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-3 text-[14px] font-semibold text-fg-muted no-underline hover:bg-surface-2 hover:text-fg",
                  section === id && "bg-surface-2 text-fg shadow-[inset_2px_0_0_var(--neon-magenta)]",
                )}
              >
                <Icon className="ico" aria-hidden />
                {t(key)}
              </a>
            ))}
            <hr className="divider" />
            <Button variant="ghost" className="justify-start" onClick={logout} loading={loggingOut}>
              {!loggingOut && <LogOut className="ico" aria-hidden />}
              {t("nav.logout")}
            </Button>
          </nav>
          <div className="min-w-0">
            <TabPanel value="profile" className={PANEL}>
              <ProfileSection />
            </TabPanel>
            <TabPanel value="security" className={PANEL}>
              <SecuritySection />
            </TabPanel>
            <TabPanel value="api-keys" className={PANEL}>
              <ApiKeysSection />
            </TabPanel>
            <TabPanel value="preferences" className={PANEL}>
              <PreferencesSection />
            </TabPanel>
            <TabPanel value="data" className={PANEL}>
              <DataSection />
            </TabPanel>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
