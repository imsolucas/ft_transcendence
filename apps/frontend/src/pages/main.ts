import { Button } from "../components/Button";
import { navigate } from "../router";

export function MainPage(): HTMLElement {
  const container = document.createElement("div");
  container.className = "flex flex-col items-center justify-center h-screen bg-gray-200 text-gray-900 dark:bg-gray-900 dark:text-white gap-6";

  // Title
  const title = document.createElement("h1");
  title.textContent = "🏓 ft_transcendence";
  title.className = "text-5xl font-bold";

  // Subtitle
  const subtitle = document.createElement("p");
  subtitle.textContent = "Welcome to the next-gen Pong platform!";
  subtitle.className = "text-gray-400";

  const playBtn = Button({
    text: "🎮 Play Game",
    onClick: () => navigate("game"),
    variant: "default",
    className: "bg-green-600 hover:bg-green-700",
  });
  const profileBtn = Button({
    text: "👤 Profile",
    onClick: () => navigate("profile"),
    variant: "outline",
    className: "bg-blue-600 hover:bg-blue-700",
  });
  const logoutBtn = Button({
    text: "🚪 Logout",
    onClick: () => navigate("landing"),
    variant: "destructive",
    className: "bg-red-600 hover:bg-red-700",
  });

  // Add elements
  container.appendChild(title);
  container.appendChild(subtitle);
  container.appendChild(playBtn);
  container.appendChild(profileBtn);
  container.appendChild(logoutBtn);

  return container;
}
