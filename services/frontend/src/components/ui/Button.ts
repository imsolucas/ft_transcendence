// components/button.ts

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonOptions {
  text: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

function getButtonClasses(variant: ButtonVariant, size: ButtonSize, extra = ""): string {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  const variants: Record<ButtonVariant, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-600 bg-transparent hover:bg-gray-400",
    secondary: "bg-gray-700 text-white hover:bg-gray-600",
    ghost: "hover:bg-gray-800 text-white",
    link: "text-blue-500 underline-offset-4 hover:underline",
  };

  const sizes: Record<ButtonSize, string> = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-10 px-6 text-lg",
    icon: "h-9 w-9 flex items-center justify-center",
  };

  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  text,
  onClick,
  variant = "default",
  size = "default",
  className = "",
}: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = getButtonClasses(variant, size, className);

  if (onClick) btn.addEventListener("click", onClick);

  return btn;
}
