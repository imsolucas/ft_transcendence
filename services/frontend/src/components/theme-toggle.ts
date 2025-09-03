export function ThemeToggle(): HTMLButtonElement {
  const button = document.createElement("button");
  button.className =
    "relative w-12 h-6 flex items-center rounded-full bg-gray-300 dark:bg-gray-700 transition-colors duration-300 focus:outline-none";

  // Knob
  const knob = document.createElement("div");
  knob.className =
    "absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-yellow-400 dark:bg-gray-200 transform transition-transform duration-300";

  // Sun 🌞 icon
  const sun = document.createElement("span");
  sun.textContent = "☀️";
  sun.className = "absolute left-1 text-sm transition-opacity duration-300 dark:opacity-0";

  // Moon 🌙 icon
  const moon = document.createElement("span");
  moon.textContent = "🌙";
  moon.className = "absolute right-1 text-sm transition-opacity duration-300 opacity-0 dark:opacity-100";

  button.appendChild(knob);
  button.appendChild(sun);
  button.appendChild(moon);

  // Handle theme switching
  button.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");

    // Move knob
    if (document.documentElement.classList.contains("dark")) {
      knob.style.transform = "translateX(1.5rem)"; // slide right
    } else {
      knob.style.transform = "translateX(0)"; // slide left
    }

    // Persist preference
    if (document.documentElement.classList.contains("dark")) {
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.setItem("theme", "light");
    }
  });

  // On load: respect system preference or saved preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
    knob.style.transform = "translateX(1.5rem)";
  }

  return button;
}
