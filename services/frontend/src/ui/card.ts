// Base Card
export function Card(className = "", children: HTMLElement[] = []): HTMLDivElement {
  const div = document.createElement("div");
  div.dataset.slot = "card";
  div.className =
    "bg-white text-gray-900 dark:bg-gray-800 dark:text-white flex flex-col gap-6 rounded-xl border border-gray-300 dark:border-gray-700 " +
    className;
  children.forEach((child) => div.appendChild(child));
  return div;
}

// Header
export function CardHeader(className = "", children: HTMLElement[] = []): HTMLDivElement {
  const div = document.createElement("div");
  div.dataset.slot = "card-header";
  div.className =
    "grid auto-rows-min items-start gap-2 px-6 pt-6 border-b border-gray-200 dark:border-gray-700 " +
    className;
  children.forEach((child) => div.appendChild(child));
  return div;
}

// Title
export function CardTitle(text: string, className = ""): HTMLHeadingElement {
  const h4 = document.createElement("h4");
  h4.dataset.slot = "card-title";
  h4.textContent = text;
  h4.className = "text-lg font-bold leading-none " + className;
  return h4;
}

// Description
export function CardDescription(text: string, className = ""): HTMLParagraphElement {
  const p = document.createElement("p");
  p.dataset.slot = "card-description";
  p.textContent = text;
  p.className = "text-gray-600 dark:text-gray-400 " + className;
  return p;
}

// Content
export function CardContent(className = "", children: HTMLElement[] = []): HTMLDivElement {
  const div = document.createElement("div");
  div.dataset.slot = "card-content";
  div.className = "px-6 py-4 " + className;
  children.forEach((child) => div.appendChild(child));
  return div;
}

// Footer
export function CardFooter(className = "", children: HTMLElement[] = []): HTMLDivElement {
  const div = document.createElement("div");
  div.dataset.slot = "card-footer";
  div.className =
    "flex items-center px-6 pb-6 border-t border-gray-200 dark:border-gray-700 " + className;
  children.forEach((child) => div.appendChild(child));
  return div;
}
