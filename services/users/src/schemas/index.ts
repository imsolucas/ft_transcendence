export const UserProfile = {
  $id: 'UserProfile',
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    username: { type: 'string', example: 'Alice' },
    email: { type: 'string', format: 'email', example: 'alice@example.com' },
    avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.png' }
  }
};

export const FriendRequest = {
  $id: 'FriendRequest',
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    fromId: { type: 'integer', example: 1 },
    toId: { type: 'integer', example: 2 },
    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
    created_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:30:00Z' }
  }
};

export const MatchHistory = {
  $id: 'MatchHistory',
  type: 'object',
  properties: {
    matchId: { type: 'integer', example: 42 },
    player1Id: { type: 'integer', example: 1 },
    player2Id: { type: 'integer', example: 2 },
    player1DisplayName: { type: 'string', example: 'Alice' },
    player2DisplayName: { type: 'string', example: 'Bob' },
    player1Score: { type: 'integer', example: 10 },
    player2Score: { type: 'integer', example: 8 },
    played_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:30:00Z' },
    end_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:40:00Z' }
  }
};
