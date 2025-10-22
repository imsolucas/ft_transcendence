import { navigate } from "../router";

export function LobbyPage(): HTMLElement {
    let container = document.createElement('div');
    container.className = "class = flex justify-center items-center h-screen"
    container.innerHTML = `
    <button class= play-button>
        play
    </button>
    `

    setTimeout(() => {
        const playButton = container.querySelector('.play-button') as HTMLButtonElement;
        
        playButton?.addEventListener('click', () => {
        console.log("Connecting to WebSocket...");

        // Use your Fastify server's address here
        const ws = new WebSocket("ws://localhost:3001/ws/game");

        ws.onopen = () => {
            console.log("Connected to the game server!");

            // Send a connection message matching your backend's expected format
            const connectionMsg = {
            type: "connection",
            data: {
                playerName: "Antoine"
            }
            };

            ws.send(JSON.stringify(connectionMsg));
            console.log("Sent connection request.");
        };

        ws.onmessage = (event) => {
            console.log("📨 Message from server:", event.data);
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        ws.onclose = () => {
            console.log(" Disconnected from the game server.");
        };
        })
    });

    return container
}