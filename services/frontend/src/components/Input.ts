export interface InputOptions extends Partial<HTMLInputElement> {
  className?: string;
  type?: string;
  placeholder?: string;
}

export function Input(options: InputOptions = {}): HTMLInputElement {
  const input = document.createElement("input");
  input.type = options.type || "text";
  input.placeholder = options.placeholder || "";

  input.className =
    "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base md:text-sm " +
    "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 " +
    "placeholder-gray-400 text-gray-900 dark:text-gray-100 " +
    "outline-none transition-colors " +
    "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400 " +
    "disabled:opacity-50 disabled:cursor-not-allowed " +
    (options.className || "");

  // Apply any other props passed
  for (const [key, value] of Object.entries(options)) {
    if (key !== "className" && key !== "type" && key !== "placeholder") {
      (input as any)[key] = value;
    }
  }

  return input;
}
