type CredentialResponse = google.accounts.id.CredentialResponse;

export interface GoogleIdTokenPayload {
  iss: string;  // The JWT's issuer
  aud: string;  // Your server's client ID
  sub: string;  // The unique ID of the user's Google Account
  iat: number;    // Unix timestamp of the assertion's creation time
  exp: number;    // Unix timestamp of the assertion's expiration time
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;   // If present, a URL to user's profile picture
  given_name?: string;
  family_name?: string;
  locale?: string;
  hd?: string;
}

export function loadGoogleSignInService(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("google-client")) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-client";
    script.onload = () => resolve();
    script.onerror = () => reject("Failed to load Google script");
    document.head.appendChild(script);
  });
}


export function decodeJWT(token: string) : GoogleIdTokenPayload {
  let base64Url = token.split(".")[1];
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  let jsonPayload = decodeURIComponent(
  atob(base64)
    .split("")
    .map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    })
    .join("")
  );
  return JSON.parse(jsonPayload);
}

export function handleCredentialResponse(response: CredentialResponse) {
  console.log("Encoded JWT ID token: " + response.credential);

  const responsePayload = decodeJWT(response.credential);

  console.log("Decoded JWT ID token fields:");
  console.log("  Full Name        : " + responsePayload.name);
  console.log("  Given Name       : " + responsePayload.given_name);
  console.log("  Family Name      : " + responsePayload.family_name);
  console.log("  Unique ID        : " + responsePayload.sub);
  console.log("  Profile image URL: " + responsePayload.picture);
  console.log("  Email            : " + responsePayload.email);
}
