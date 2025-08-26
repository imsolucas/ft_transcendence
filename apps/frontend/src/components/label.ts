export interface LabelOptions {
  text: string;
  htmlFor?: string;
  className?: string;
}

export function Label({ text, htmlFor, className = "" }: LabelOptions): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = text;
  if (htmlFor) label.htmlFor = htmlFor;

  label.className =
    "flex items-center gap-2 text-sm font-medium leading-none select-none " +
    "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 " +
    className;

  return label;
}
