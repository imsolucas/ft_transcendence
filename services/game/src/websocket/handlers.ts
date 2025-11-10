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
import type { Room } from '../types/room.types.js';
import { RoomManager } from '../game/roomManager.js';
import { pongSessions } from '../index.js';
import { MessageBroadcaster } from './broadcaster.js';
import { randomUUID } from 'crypto';
import { GameServer } from '../game/GameServer.js';

export class MessageHandler {
  constructor(
    private roomManager: RoomManager,
    private broadcaster: MessageBroadcaster,
  ) {}

  // Unified message router - single entry point for all authenticated messages
  routeMessage(data: any, player: Player): void {
    switch (data.type) {
      case "joinQueue":
        this.handleJoinQueue(data as JoinQueueMessage, player);
        break;
      case "joinTournament":
        this.handleJoinTournament(data as JoinQueueMessage, player);
        break;
      case "leaveRoom":
        this.handleDisconnection(player);
        break;
      case "playerReady":
        this.handlePlayerReady(data as PlayerReadyMessage, player);
        break;
      case "playerInput":
        this.handlePlayerInput(data as PlayerInputMessage, player);
        break;
      default:
        console.error('Unknown message type:', data.type);
    }
  }

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

  handleJoinQueue(data: JoinQueueMessage, player: Player): Room | null {
    console.log(`"${player.id}", Requesting to join queue`);

    if (data.data.roomId)
      return (this.joinRoom(player, data));
    else
      return (this.joinQueue(player, data));
  }

  handleJoinTournament(data: JoinQueueMessage, player: Player): Room | null {
    console.log(`"${player.id}", Requesting to join tournament`);

    if (data.data.roomId)
      return (this.joinRoom(player, data));
    else
      return (this.joinTournament(player, data));
  }

  joinRoom(player: Player, data: JoinQueueMessage): Room | null {
    const roomId = data.data.roomId;

    if (!roomId) {
      this.sendError(player.socket, "Room ID is required");
      return null;
    }

    const room = this.roomManager.getRoom(roomId);

    if (!room) {
      this.sendError(player.socket, "Room not found");
      return null;
    }

    if (this.roomManager.isRoomFull(roomId)) {
      this.sendError(player.socket, "Room is full");
      return null;
    }

    this.roomManager.addPlayerToRoom(roomId, player.id);
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);
    const position = player ? player.position : 0;

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: player.name,
        playerId: player.id,
        roomId: roomId,
        position: position,
        playersInRoom: playersInRoom
      },
      timestamp: Date.now()
    }
    this.broadcaster.broadcastToRoom(roomId, response);
    console.log(`Player "${player.name}" joined room "${roomId}"`);

    return room || null;
  }

  joinQueue(player: Player, data: JoinQueueMessage): Room | null {
    const availableRooms = this.roomManager.getAvailableRooms() || [];
    let room: Room;

    if (this.roomManager.getRoom(player.roomId)){
      this.sendError(player.socket, "Player Already in room");
      console.error(`Player "${player.id}" already in room ${player.roomId}`);
      return null;
    }

    // For queue, look for available standard rooms only
    const standardRoom = availableRooms.find(r => r.type === 'standard');

    if (standardRoom)
      room = standardRoom;
    else {
      room = this.roomManager.createRoom('standard');
      console.log(`Player "${player.name}" created room "${room.id}"`);
    }
    this.roomManager.addPlayerToRoom(room.id, player.id);
    console.log(`Player "${player.name}" joined room "${room.id}"`);

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: player.name,
        playerId: player.id,
        roomId: room.id,
        position: player.position,
        playersInRoom: this.roomManager.getPlayersInRoom(room.id).map(toSerializablePlayer)
      },
      timestamp: Date.now()
    };
    this.broadcaster.broadcastToRoom(room.id, response);
    return room;
  }

  joinTournament(player: Player, data: JoinQueueMessage): Room | null {
    const availableRooms = this.roomManager.getAvailableRooms() || [];
    let room: Room;

    if (this.roomManager.getRoom(player.roomId)){
      this.sendError(player.socket, "Player Already in room");
      console.error(`Player "${player.id}" already in room ${player.roomId}`);
      return null;
    }

    // For tournaments, look for available tournament rooms only
    const tournamentRoom = availableRooms.find(r => r.type === 'tournament');

    if (tournamentRoom)
      room = tournamentRoom;
    else {
      room = this.roomManager.createRoom('tournament');
      console.log(`Player "${player.name}" created tournament room "${room.id}"`);
    }
    this.roomManager.addPlayerToRoom(room.id, player.id);
    console.log(`Player "${player.name}" joined tournament room "${room.id}"`);

    const response: PlayerJoinedMessage = {
      type: 'playerJoined',
      data: {
        playerName: player.name,
        playerId: player.id,
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

    if (!this.roomManager.getPlayersInRoom(player.roomId).includes(player)){
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

    // check if players are ready and start game
    this.checkAndStartGame(player.roomId);
  }

  private checkAndStartGame(roomId: string): void {
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

    // need between 2 and 8 players to start
    if (playersInRoom.length < 2 || playersInRoom.length > 8) {
      console.log(`Cannot start game, room length: ${playersInRoom.length}`);
      return;
    }

    // all players must be ready
    const allReady = playersInRoom.every(p => p.isReady);
    if (!allReady) {
      console.log("Not all players ready");
      return;
    }

    // Set room status to 'playing'
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.status = 'playing';
      pongSessions.set(roomId, new GameServer(room, this.broadcaster));
    }

    console.log('All players are ready - starting game!');

    const startMessage: GameStartMessage = {
      type: 'gameStart',
      data: {
        players: playersInRoom.map(p => ({
          playerId: p.id,
          playerName: p.name,
          position: p.position
        }))
      },
      timestamp: Date.now()
    };

    // broadcast to all players
    this.broadcaster.broadcastToRoom(roomId, startMessage);
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

  private sendError(connection: WebSocket, message: string): void {
    const errorResponse: ConnectionErrorMessage = {
      type: 'connectionError',
      data: { message },
      timestamp: Date.now()
    };
    connection.send(JSON.stringify(errorResponse));
  }

  handlePlayerInput(data: PlayerInputMessage, player: Player) {
    const room = this.roomManager.getRoom(player.roomId);
    if (!room) return;

    const session = pongSessions.get(room.id);
    if (!session) return;

    if (room.playerIds[0] == player.id)
      session.input(data.data.inputs, undefined);
    else
      session.input(undefined, data.data.inputs);
  }
}