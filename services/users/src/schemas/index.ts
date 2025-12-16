export const UserProfile = {
  $id: 'UserProfile',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string', format: 'email' },
    avatar: { type: 'string', format: 'uri' }
  }
};

export const FriendRequest = {
  $id: 'FriendRequest',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    fromId: { type: 'integer' },
    toId: { type: 'integer' },
    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
    created_at: { type: 'string', format: 'date-time' }
  }
};

export const MatchHistory = {
  $id: 'MatchHistory',
  type: 'object',
  properties: {
    matchId: { type: 'integer' },
    tournamentId: { type: 'integer', nullable: true },
    player1Id: { type: 'integer' },
    player2Id: { type: 'integer' },
    player1DisplayName: { type: 'string' },
    player2DisplayName: { type: 'string' },
    player1Score: { type: 'integer' },
    player2Score: { type: 'integer' },
    winnerId: { type: 'integer', nullable: true },
    played_at: { type: 'string', format: 'date-time' },
    end_at: { type: 'string', format: 'date-time' }
  }
};

export const UnauthorizedError = {
  $id: "UnauthorizedError",
  type: "object",
  properties: {
    error: { type: "string" }
  }
};

export const InternalServerError = {
  $id: "InternalServerError",
  type: "object",
  properties: {
    error: { type: "string" }
  }
};
