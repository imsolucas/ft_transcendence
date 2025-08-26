import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Button } from "../components/Button";
import { navigate } from "../router";

export function LandingPage(): HTMLElement {
	// Page container
	const container = document.createElement("div");

	// Build Card
	const card = Card("w-full max-w-md", [
		CardHeader("text-center", [
			CardTitle("Gaming Platform", "text-3xl mb-2"),
			CardDescription("Welcome to the ultimate gaming experience"),
		]),
		CardContent("space-y-4", [
			Button({
				text: "Sign Up",
				onClick: () => navigate("registration"),
				variant: "default",
				className: "w-full bg-black hover:bg-gray-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700",
			}),
			Button({
				text: "Log In",
				onClick: () => navigate("login"),
				variant: "outline",
				className: "w-full",
			}),
		]),
	]);
	container.appendChild(card);

	return container;
}
