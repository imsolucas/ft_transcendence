/** Re-mounted on every page change inside this route group: plays the arcade top-to-bottom wipe (styles/arcade.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="arcade-enter">{children}</div>;
}
