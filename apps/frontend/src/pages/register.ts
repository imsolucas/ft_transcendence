import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Label } from "../components/label";
import { navigate } from "../router";

export function RegistrationPage(): HTMLElement {
  const container = document.createElement("div");
  container.className = "flex items-center justify-center min-h-screen p-4";

  // Username field
  const usernameField = document.createElement("div");
  usernameField.className = "space-y-2";
  usernameField.appendChild(Label({ htmlFor: "username", text: "Username" }));
  usernameField.appendChild(
    Input({ id: "username", placeholder: "Enter username" })
  );

  // Email field
  const emailField = document.createElement("div");
  emailField.className = "space-y-2";
  emailField.appendChild(Label({ htmlFor: "email", text: "Email" }));
  emailField.appendChild(
    Input({ id: "email", type: "email", placeholder: "Enter email" })
  );

  // Password field
  const passwordField = document.createElement("div");
  passwordField.className = "space-y-2";
  passwordField.appendChild(Label({ htmlFor: "password", text: "Password" }));
  passwordField.appendChild(
    Input({ id: "password", type: "password", placeholder: "Enter password" })
  );

  // Buttons with landing page style
  const signUpBtn = Button({
    text: "Sign Up",
    variant: "default",
    className:
      "w-full bg-black hover:bg-gray-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700",
    onClick: () => navigate("main"),
  });

  const backBtn = Button({
    text: "Back to Landing",
    variant: "outline",
    className: "w-full",
    onClick: () => navigate("landing"),
  });

  // Card layout (same width as landing)
  const card = Card("w-full max-w-md", [
    CardHeader("text-center", [
      CardTitle("Create Account", "text-3xl mb-2"),
      CardDescription("Sign up to start your gaming adventure"),
    ]),
    CardContent("space-y-4", [
      usernameField,
      emailField,
      passwordField,
      signUpBtn,
      backBtn,
    ]),
  ]);

  container.appendChild(card);
  return container;
}
