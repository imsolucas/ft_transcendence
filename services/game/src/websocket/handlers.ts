import type {
  ConnectionMessage,
  ConnectionSuccessMessage,
  ConnectionErrorMessage,
  GameMessage,
  playerJoined,
  playerLeft
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
    const joinMessage: playerJoined = {
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

  handleDisconnection(player: Player): void {
    // broadcast leave message
    const leaveMessage: playerLeft = {
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

  private sendError(connection: any, message: string): void {
    const errorResponse: ConnectionErrorMessage = {
      type: 'connectionError',
      data: { message },
      timestamp: Date.now()
    };
    connection.send(JSON.stringify(errorResponse));
  }
}