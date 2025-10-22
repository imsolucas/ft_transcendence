import type {
  ConnectionMessage,
  ConnectionSuccessMessage,
  ConnectionErrorMessage,
  PlayerReadyMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameStartMessage,
  JoinRoomMessage,
  CreateRoomMessage
} from '../types/protocol.types.js';
import type { Player } from '../types/player.types.js';
import type { Room } from '../types/room.types.js';
import { RoomManager } from '../game/roomManager.js';
import { MessageBroadcaster } from './broadcaster.js';
import { randomUUID } from 'crypto';

export class MessageHandler {
  constructor(
    private roomManager: RoomManager,
    private broadcaster: MessageBroadcaster,
  ) {}

  handleConnection(data: ConnectionMessage, connection: any): Player | null {
    console.log(`Player "${data.data.playerName}" wants to connect.`);

    const playerId = 'player_' + randomUUID().substring(0, 8).toLowerCase();
    const roomId = "0";
    const position = 0;

    // make new player object
    const newPlayer: Player = {
      id: playerId,
      name: data.data.playerName,
      socket: connection,
      roomId: roomId,
      position: position,
      connectedAt: Date.now(),
      isReady: false
    };

    // create connection success object
    const response: ConnectionSuccessMessage = {
      type: 'connectionSuccess',
      data: {
        playerId: playerId,
      },
      timestamp: Date.now()
    };
    // send to client
    connection.send(JSON.stringify(response));
    return newPlayer;
  }

  handleJoinRoom(data: JoinRoomMessage, connection: any): Room | null {
    console.log(`Requesting to join room', "$(data.data.roomId)" `);

    const roomId = data.data.roomId;
    const playerId = data.data.playerId;
    const room = this.roomManager.getRoom(roomId);

    if (!room) {
      this.sendError(connection, "Room not found");
      return null;
    }

    if (this.roomManager.isRoomFull(roomId)) {
      this.sendError(connection, "Room is full");
      return null;
    }

    const player = this.roomManager.getPlayer(playerId);
    if (!player) {
      this.sendError(connection, "Player not found");
      return null;
    }

    const position = this.roomManager.getPlayerPosition(roomId);
    player.position = position;
    this.roomManager.addPlayerToRoom(roomId, player);

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerId: playerId,
        roomId: roomId,
        position: position
      },
      timestamp: Date.now()
    }
    connection.send(JSON.stringify(response));

    return room;
  }

  handleCreateRoom(data: CreateRoomMessage, connection: any): Room | null {
    console.log(`Requesting to create room', "$(data.data.roomId)"`);

    const playerId = data.data.playerId;
    const player = this.roomManager.getPlayer(playerId);

    if (!player) {
      this.sendError(connection, "Player not found");
      return null;
    }

    const room = this.roomManager.createRoom();
    const roomId = room.id;
    const position = 1;
    player.roomId = roomId;
    player.position = position;
    this.roomManager.addPlayerToRoom(player, room);

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerId: playerId,
        roomId: roomId,
        position: position
      },
      timestamp: Date.now()
    }
    connection.send(JSON.stringify(response));

    return room;

  }

  handlePlayerReady(data: PlayerReadyMessage, player: Player): void {
    console.log(`Player "${player.name}" is ${data.data.ready ? 'ready' : 'not ready'}`);

    // broadcast to other players in room
    const readyMessage = {
      type: 'playerReady',
      data: {
        playerName: player.name,
        playerId: player.id,
        ready: data.data.ready
      },
      timestamp: Date.now()
    };

    player.isReady = data.data.ready;
    this.broadcaster.broadcastToRoom(player.roomId, readyMessage, player.id);

    // check if both players are ready and start game
    this.checkAndStartGame(player.roomId);
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
    this.broadcaster.broadcastToRoom(player.roomId, leaveMessage, player.id);

    console.log(`Player "${player.name}" (${player.id}) disconnected`);
    this.roomManager.removePlayerFromRoom(player.roomId, player.id);
  }

  private checkAndStartGame(roomId: string): void {
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

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

    // both positions must be filled and both players must be ready
    if (!player1 || !player2 || !player1.isReady || !player2.isReady) {
      return;
    }

    console.log('Both players are ready - starting game!');

    const startMessage: GameStartMessage = {
      type: 'gameStart',
      data: {
        player1id: player1.id,
        player1Name: player1.name,
        player2id: player2.id,
        player2Name: player2.name
      },
      timestamp: Date.now()
    };

    // broadcast to both players
    this.broadcaster.broadcastToRoom(roomId, startMessage);
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