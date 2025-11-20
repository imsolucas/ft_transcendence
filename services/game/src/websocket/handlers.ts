import {
  type ConnectionMessage,
  type ConnectionSuccessMessage,
  type ConnectionErrorMessage,
  type PlayerReadyMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type GameStartMessage,
  type JoinQueueMessage,
  type TournamentStateMessage,
} from 'shared';

import type { PlayerInputMessage, Player } from 'shared';
import { toSerializablePlayer } from 'shared';
import type { Room } from '../types/room.types.js';
import { RoomManager } from '../game/roomManager.js';
import { pongSessions } from '../index.js';
import { MessageBroadcaster } from './broadcaster.js';
import { randomUUID } from 'crypto';
import { GameServer } from '../game/GameServer.js';
import { json } from 'stream/consumers';

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
    else if (data.data.roomType == 'tournament')
      return (this.joinTournament(player, data));
    else
      return (this.joinQueue(player, data));
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

    // Assign tournament roles
    this.assignTournamentRoles(room);

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

    // Broadcast tournament state to all players
    this.broadcastTournamentState(room.id);

    return room;
  }

  private assignTournamentRoles(room: Room): void {
    if (room.type !== 'tournament') return;

    const playerIds = room.playerIds;

    // First player becomes king
    if (!room.kingId && playerIds.length >= 1 && playerIds[0]) {
      room.kingId = playerIds[0];
      console.log(`Player ${room.kingId} is now the king`);
    }

    // Second player becomes challenger
    if (!room.challengerId && playerIds.length >= 2 && playerIds[1]) {
      room.challengerId = playerIds[1];
      console.log(`Player ${room.challengerId} is now the challenger`);
    }

    // Remaining players go to queue
    room.queueIds = playerIds.slice(2);
  }

  private broadcastTournamentState(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.type !== 'tournament') return;

    const king = room.kingId ? this.roomManager.getPlayer(room.kingId) : undefined;
    const challenger = room.challengerId ? this.roomManager.getPlayer(room.challengerId) : undefined;
    const queuePlayers = room.queueIds.map(id => this.roomManager.getPlayer(id)).filter(p => p !== undefined);

      const tournamentState: TournamentStateMessage = {
        type: 'tournamentState',
        data: {
          roomType: room.type,
          kingId: king ? king.id : '',
          kingName: king ? king.name : '',
          challengerId: challenger ? challenger.id : '',
          challengerName: challenger ? challenger.name : '',
          queue: queuePlayers.map(p => ({
            playerId: p!.id,
            playerName: p!.name
          }))
        },
        timestamp: Date.now()
      };

    this.broadcaster.broadcastToRoom(roomId, tournamentState);
  }

  // Called when a tournament round ends (one player reaches 2 points) and switch king/challenger
  handleTournamentRoundEnd(roomId: string, winnerId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.type !== 'tournament') return;

    console.log(`tournament round winner: ${winnerId}`);

    // Determine if winner is king or challenger
    const kingWon = winnerId === room.kingId;

    if (kingWon) {
      // King wins: challenger goes to back of queue
      if (room.challengerId) {
        console.log(`king won, challenger ${room.challengerId} goes to back of queue`);
        room.queueIds.push(room.challengerId);
      }

      // Next player in queue becomes new challenger
      if (room.queueIds.length > 0) {
        const nextId = room.queueIds.shift();
        if (nextId) {
          room.challengerId = nextId;
          console.log(`New challenger: ${room.challengerId}`);
        }
      } else {
        delete room.challengerId;
      }
    } else {
      // Challenger wins: becomes new king, old king goes to back of queue
      console.log(`challenger won, old king ${room.kingId} goes to back of queue`);

      if (room.kingId) {
        room.queueIds.push(room.kingId);
      }

      // Challenger becomes new king
      if (room.challengerId) {
        room.kingId = room.challengerId;
        console.log(`New king: ${room.kingId}`);

        // Reset new king ready state
        const newKing = this.roomManager.getPlayer(room.challengerId);
      }

      // Next player in queue becomes new challenger
      if (room.queueIds.length > 0) {
        const nextId = room.queueIds.shift();
        if (nextId) {
          room.challengerId = nextId;
          console.log(`New challenger: ${room.challengerId}`);
        }
      } else {
        delete room.challengerId;
      }
    }

    // Broadcast updated tournament state
    this.broadcastTournamentState(roomId);
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
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

    // Check minimum and maximum players based on room type
    if (room.type === 'standard') {
      // Standard rooms need exactly 2 players
      if (playersInRoom.length !== 2) {
        console.log(`Cannot start standard game, need 2 players, have ${playersInRoom.length}`);
        return;
      }
    } else {
      // Tournament rooms need 2-8 players
      if (playersInRoom.length < 2 || playersInRoom.length > 8) {
        console.log(`Cannot start tournament game, need 2-8 players, have ${playersInRoom.length}`);
        return;
      }
    }

    // all players must be ready
    const allReady = playersInRoom.every(p => p.isReady);
    if (!allReady) {
      console.log("Not all players ready");
      return;
    }

    // Set room status to 'playing'
    room.status = 'playing';
    pongSessions.set(roomId, new GameServer(room, this.broadcaster));

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

    console.log(`Input from player ${player.name}`)
    console.log(JSON.stringify(data.data));
    const session = pongSessions.get(room.id);
    if (!session) return;

    if (room.playerIds[0] == player.id)
      session.input(data.data.inputs, undefined);
    else
      session.input(undefined, data.data.inputs);
  }
}