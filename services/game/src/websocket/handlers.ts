import type {
  ConnectionMessage,
  ConnectionSuccessMessage,
  ConnectionErrorMessage,
  PlayerReadyMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameStartMessage
} from '../types/protocol.types.js';
import type { Player, PlayerStorage } from '../types/player.types.js';
import { RoomManager } from '../game/roomManager.js';
import { MessageBroadcaster } from './broadcaster.js';

export class MessageHandler {
  constructor(
    private roomManager: RoomManager,
    private broadcaster: MessageBroadcaster,
    private playerStorage: PlayerStorage
  ) {}

  handleConnection(data: ConnectionMessage, connection: any): Player | null {
    console.log(`Player "${data.data.playerName}" wants to connect.`);

    const playerID = 'player_' + Math.random().toString(36).substring(2, 5);
    const roomID = "default";

    // check room capacity BEFORE adding player
    const position = this.roomManager.getPlayerPosition(roomID);
    if (position === -1) {
      console.log(`Room ${roomID} is full`);
      // for now, reject the connection if room is full, maybe we can do spectator mode??
      this.sendError(connection, "Room is full");
      return null;
    }

    // make new player object
    const newPlayer: Player = {
      id: playerID,
      name: data.data.playerName,
      socket: connection,
      roomID: roomID,
      position: position,
      connectedAt: Date.now()
    };

    // add to storage
    if (!this.roomManager.addPlayerToRoom(newPlayer)) {
      this.sendError(connection, "Failed to join room");
      return null;
    }

    // create connection success object
    const response: ConnectionSuccessMessage = {
      type: 'connectionSuccess',
      data: {
        playerID: playerID,
        roomID: roomID,
        position: position
      },
      timestamp: Date.now()
    };
    // send to client
    connection.send(JSON.stringify(response));

    // broadcast to other players
    const joinMessage: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: data.data.playerName,
        position: position
      },
      timestamp: Date.now()
    };
    this.broadcaster.broadcastToRoom(roomID, joinMessage, playerID);

    console.log(`Player "${data.data.playerName}": ${playerID} connected successfully.`);
    console.log(`Total players online: ${this.playerStorage.getPaxInRoom('default')}`);

    return newPlayer;
  }

  handlePlayerReady(data: PlayerReadyMessage, player: Player): void {
    console.log(`Player "${player.name}" is ${data.data.ready ? 'ready' : 'not ready'}`);

    // broadcast to other players in room
    const readyMessage = {
      type: 'playerReady',
      data: {
        playerName: player.name,
        playerID: player.id,
        ready: data.data.ready
      },
      timestamp: Date.now()
    };

    this.broadcaster.broadcastToRoom(player.roomID, readyMessage, player.id);

    // check if both players are ready and start game
    this.checkAndStartGame(player.roomID);
  }

  handleDisconnection(player: Player): void {
    // broadcast leave message
    const leaveMessage: PlayerLeftMessage = {
      type: 'playerLeft',
      data: {
        playerName: player.name
      },
      timestamp: Date.now()
    };

    // broadcast BEFORE removing the player, so others get notified
    this.broadcaster.broadcastToRoom(player.roomID, leaveMessage, player.id);

    console.log(`Player "${player.name}" (${player.id}) disconnected`);
    this.roomManager.removePlayerFromRoom(player.id);
    console.log(`Total players online: ${this.playerStorage.getPaxInRoom('default')}`);
  }

  private checkAndStartGame(roomID: string): void {
    const playersInRoom = this.playerStorage.getPlayersInRoom(roomID);

    // need exactly 2 players to start
    if (playersInRoom.length !== 2) {
      return;
    }

    // find position 1 and position 2 players
    let player1: Player | null = null;
    let player2: Player | null = null;

    for (const player of playersInRoom) {
      if (player.position === 1) player1 = player;
      if (player.position === 2) player2 = player;
    }

    // both positions must be filled
    if (!player1 || !player2) {
      return;
    }

    // for now, assume all connected players are ready
    // later we'll track ready status properly
    console.log('Both players connected - starting game!');

    const startMessage: GameStartMessage = {
      type: 'gameStart',
      data: {
        player1Id: player1.id,
        player1Name: player1.name,
        player2Id: player2.id,
        player2Name: player2.name
      },
      timestamp: Date.now()
    };

    // broadcast to both players
    this.broadcaster.broadcastToRoom(roomID, startMessage);
  }

  private sendError(connection: any, message: string): void {
    const errorResponse: ConnectionErrorMessage = {
      type: 'connectionError',
      data: { message },
      timestamp: Date.now()
    };
    connection.send(JSON.stringify(errorResponse));
  }
}