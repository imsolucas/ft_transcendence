import {
  type ConnectionMessage,
  type ConnectionSuccessMessage,
  type ConnectionErrorMessage,
  type PlayerReadyMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type GameStartMessage,
  type JoinQueueMessage,
} from 'shared';
import type { PlayerInputMessage, Player } from 'shared';
import { toSerializablePlayer } from 'shared';
import type { Room } from 'shared';
import { RoomManager } from '../game/roomManager.js';
import { pongSessions } from '../index.js';
import { MessageBroadcaster } from './broadcaster.js';
import { randomUUID } from 'crypto';
import { platform } from 'os';
import { GameServer } from '../game/GameServer.js';
import { createInitialGameState } from '../utils/gameUtils.js';

export class MessageHandler {
  constructor(
    private roomManager: RoomManager,
    private broadcaster: MessageBroadcaster,
  ) {}

  handleConnection(data: ConnectionMessage, connection: any): Player | null {
    console.log(`Player "${data.data.playerName}" wants to connect.`);

    const playerId = 'player_' + randomUUID().substring(0, 8).toLowerCase();
    const roomId = "";
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
  // store the player so future lookups succeed
  this.roomManager.addPlayer(newPlayer);

  // send to client
  connection.send(JSON.stringify(response));
  return newPlayer;
  }

  handleJoinQueue(data: JoinQueueMessage, connection: any): Room | null {
    console.log(`"${data.data.playerId}", Requesting to join queue`);

    const playerId = data.data.playerId;
    if (!this.roomManager.getPlayer(playerId)) {
      this.sendError(connection, "Player not found");
      return null;
    }

    if (data.data.roomId)
      return (this.joinRoom(playerId, data, connection));
    else
      return (this.joinQueue(playerId, data, connection));
  }

  joinRoom(playerId: string, data: JoinQueueMessage, connection: any): Room | null {
    const roomId = data.data.roomId;

    if (!roomId) {
      this.sendError(connection, "Room ID is required");
      return null;
    }

    const room = this.roomManager.getRoom(roomId);

    if (!room) {
      this.sendError(connection, "Room not found");
      return null;
    }

    if (this.roomManager.isRoomFull(roomId)) {
      this.sendError(connection, "Room is full");
      return null;
    }

    this.roomManager.addPlayerToRoom(roomId, playerId);
    const player = this.roomManager.getPlayer(playerId);
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);
    const position = player ? player.position : 0;

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: player?.name!,
        playerId: playerId,
        roomId: roomId,
        position: position,
        playersInRoom: playersInRoom
      },
      timestamp: Date.now()
    }
    this.broadcaster.broadcastToRoom(roomId, response);
    console.log(`Player "${player ? player.name : playerId}" joined room "${roomId}"`);

    return room || null;
  }

  joinQueue(playerId: string, data: JoinQueueMessage, connection: any) {
    const availableRooms = this.roomManager.getAvailableRooms() || [];
    const player = this.roomManager.getPlayer(playerId);
    let room: Room;
  
    if (!player){
      console.error(`Player with id: ${playerId} not found`);
      return null;
    }

    if (availableRooms[0])
      room = availableRooms[0]
    else {
      room = this.roomManager.createRoom();
      console.log(`Player "${player.name}" created room "${room.id}"`);
    }
    this.roomManager.addPlayerToRoom(room.id, playerId);
    console.log(`Player "${player.name}" joined room "${room.id}"`);

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: player.name,
        playerId: playerId,
        roomId: room.id,
        position: player.position,
        playersInRoom: this.roomManager.getPlayersInRoom(room.id).map(toSerializablePlayer)
      },
      timestamp: Date.now()
    };
    this.broadcaster.broadcastToRoom(room.id, response);
    return room;
  }

  handlePlayerReady(data: PlayerReadyMessage, player: Player): void {
    console.log(`Player "${player.name}" is ${data.data.ready ? 'ready' : 'not ready'}`);
    
    if (this.roomManager.getPlayersInRoom(player.roomId).includes(player)){
      this.sendError(player.socket, `Unable to ready: Player "${player.name}" not in room "${player.roomId}"`);
      return ;
    }

    // broadcast to other players in room
    const readyMessage: PlayerReadyMessage = {
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

    player.roomId = "";
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

    // Set room and GameRoom status to 'playing'
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.status = 'playing';
      // GameRoomManager removed, just create PongSession
      pongSessions.set(roomId, new GameServer(room, this.broadcaster));
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

  private sendError(connection: WebSocket, message: string): void {
    const errorResponse: ConnectionErrorMessage = {
      type: 'connectionError',
      data: { message },
      timestamp: Date.now()
    };
    connection.send(JSON.stringify(errorResponse));
  }

  handlePlayerInput(data: PlayerInputMessage, player: Player) {
    const room = this.roomManager.getRoom(data.data.roomId);
    if (!room) return;

    const session = pongSessions.get(room.id);
    if (!session) return;

    if (room.playerIds[0] == player.id)
      session.input(data.data.inputs, undefined);
    else
      session.input(undefined, data.data.inputs);
  }
}