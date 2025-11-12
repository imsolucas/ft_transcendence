# Tournament King of the Hill Integration Guide

## Overview
The tournament system now supports King of the Hill mode where:
- First player becomes the **King**
- Second player becomes the **Challenger**
- Remaining players join the **Queue**
- When a game ends (someone reaches 2 points):
  - **King wins**: Challenger goes to back of queue, next player becomes challenger
  - **Challenger wins**: Becomes new king, old king goes to back of queue, next player becomes challenger

## What's Been Implemented

### 1. Room Structure (`room.types.ts`)
- Added `queueIds: string[]` to track waiting players
- `kingId` and `challengerId` already existed

### 2. Protocol Types (`protocol.types.ts`)
- Added `TournamentStateMessage` that broadcasts:
  - King ID and name
  - Challenger ID and name
  - Queue of waiting players

### 3. Handler Methods (`handlers.ts`)

#### `assignTournamentRoles(room: Room)`
- Automatically assigns king (1st player), challenger (2nd player), and queue (rest)
- Called when players join tournament

#### `broadcastTournamentState(roomId: string)`
- Broadcasts current tournament state to all players in room
- Shows who's king, challenger, and who's in queue

#### `handleTournamentGameEnd(roomId: string, winnerId: string)`
- Call this when a game ends (player reaches 2 points)
- Automatically rotates players based on winner
- Resets all player ready states
- Broadcasts new tournament state

## Integration Steps

### Step 1: Update GameServer to Call handleTournamentGameEnd

In your `GameServer` or game logic, when a player reaches 2 points:

\`\`\`typescript
// In GameServer.ts or wherever you track scores
if (player1Score >= 2 || player2Score >= 2) {
  const winnerId = player1Score >= 2 ? player1Id : player2Id;
  
  // For tournament rooms, call the handler
  if (this.room.type === 'tournament') {
    // You'll need access to messageHandler
    messageHandler.handleTournamentGameEnd(this.room.id, winnerId);
  }
  
  // End the current game
  this.endGame();
}
\`\`\`

### Step 2: Export handleTournamentGameEnd

You may need to make `handleTournamentGameEnd` public and accessible from GameServer:

Option A: Pass messageHandler to GameServer constructor
\`\`\`typescript
constructor(
  private room: Room,
  private broadcaster: MessageBroadcaster,
  private messageHandler: MessageHandler // Add this
) { ... }
\`\`\`

Option B: Create a callback function
\`\`\`typescript
// In handlers.ts when creating GameServer
pongSessions.set(roomId, new GameServer(
  room,
  this.broadcaster,
  (winnerId) => this.handleTournamentGameEnd(roomId, winnerId)
));
\`\`\`

### Step 3: Update Frontend to Display Tournament State

Listen for `tournamentState` messages:

\`\`\`javascript
socket.onmessage = function(event) {
  const message = JSON.parse(event.data);
  
  if (message.type === 'tournamentState') {
    const { kingId, kingName, challengerId, challengerName, queue } = message.data;
    
    // Display king
    if (kingId) {
      console.log(\`👑 King: \${kingName}\`);
    }
    
    // Display challenger
    if (challengerId) {
      console.log(\`⚔️ Challenger: \${challengerName}\`);
    }
    
    // Display queue
    console.log(\`📋 Queue: \${queue.map(p => p.playerName).join(', ')}\`);
    
    // Update UI accordingly
  }
};
\`\`\`

### Step 4: Only Allow King and Challenger to Ready Up

In your ready logic, check if player is king or challenger:

\`\`\`typescript
// In handlePlayerReady
if (room.type === 'tournament') {
  // Only king and challenger can ready up
  if (player.id !== room.kingId && player.id !== room.challengerId) {
    this.sendError(player.socket, "Only king and challenger can ready up");
    return;
  }
}
\`\`\`

## Testing

1. Create a tournament room with 3+ players
2. Verify king and challenger are assigned correctly
3. Verify queue shows remaining players
4. Have king and challenger ready up and start game
5. End game (give one player 2 points)
6. Verify roles rotate correctly
7. Verify ready states are reset
8. Verify new tournament state is broadcast

## Notes

- Player ready states are automatically reset after each game
- Room status changes back to 'waiting' after game ends
- Queue order is maintained (FIFO - First In First Out)
- If there's no one in queue, challenger slot stays empty until someone joins
