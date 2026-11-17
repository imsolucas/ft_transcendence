/** Full-focus screens (setup, matchmaking, in-game): no app navigation. */
export default function FocusLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <main id="main" className="flex min-h-dvh flex-col">
      {children}
    </main>
  );
}
