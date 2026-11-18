import type { RatingUpdateMessage } from "shared/index.ts";
import type { RoomManager } from "../rooms/roomManager.ts";
import type { RatingChange } from "../users-api/results.ts";

/**
 * After a ranked match the users service answers with both players' new ratings: keep them on
 * the Player (for the next matchmaking) and tell each player their own change.
 */
export function applyRatings(roomManager: RoomManager, roomId: string, ratings: Record<string, RatingChange>): void {
  for (const [userId, change] of Object.entries(ratings)) {
    const player = roomManager.getPlayer(userId);
    if (!player) continue;
    // a late answer (after retries) must not undo a newer match's rating
    if ((player.ratedGames ?? 0) > change.games) continue;
    player.ratedGames = change.games;
    player.rating = change.rating;
    // the toast belongs to the end screen of that match: skip it if they moved on
    if (player.roomId !== roomId) continue;
    const msg: RatingUpdateMessage = { type: "ratingUpdate", data: change, timestamp: Date.now() };
    try {
      player.socket?.send(JSON.stringify(msg));
    } catch {
      // the socket closed meanwhile: the rating is stored anyway
    }
  }
}
