import type { Player, PlayerJoinedMessage, TournamentStateMessage } from 'shared/index.js';
import type { RoomManager } from '../game/roomManager.js';

export class MessageBroadcaster {
  constructor(private roomManager: RoomManager) {}

  broadcastTournamentState(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.type !== 'tournament') return;

    const king = room.kingId ? this.roomManager.getPlayer(room.kingId) : undefined;
    const challenger = room.challengerId ? this.roomManager.getPlayer(room.challengerId) : undefined;
    const queuePlayers = room.queueIds.map(id => this.roomManager.getPlayer(id)).filter(p => p !== undefined);

      const tournamentState: TournamentStateMessage = {
        type: 'tournamentState',
        data: { state : {
          kingId: king ? king.id : '',
          kingName: king ? king.name : '',
          challengerId: challenger ? challenger.id : '',
          challengerName: challenger ? challenger.name : '',
          queue: queuePlayers.map(p => ({
            playerId: p!.id,
            playerName: p!.name
          }))
        }},
        timestamp: Date.now()
      };

    this.broadcastToRoom(roomId, tournamentState);
  }

  broadcastToRoom(roomId: string, message: any, excludePlayerid?: string): void {
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

    for (const player of playersInRoom) {
      // skip the excluded player if specified
      if (excludePlayerid && player.id === excludePlayerid) {
        continue;
      }

      // send message to this player's socket
      player.socket.send(JSON.stringify(message));
    }

    console.log(`Broadcasted to ${playersInRoom.length} players in room ${roomId}`);
  }
}