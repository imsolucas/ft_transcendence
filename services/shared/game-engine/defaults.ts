// plain object (not a namespace) so Node's type stripping can run the engine (users service)
export const defaults = {
    PADDLE_SPEED: 47,
    PADDLE_FRICTION: 0.1,
    PADDLE_HEIGHT: 25,
    PADDLE_WIDTH: 4,
    COURT_HEIGHT: 100,
    COURT_WIDTH: 160,
    BALL_SIZE: 4,
    BALL_SPEED_MAX: 50,
    WIN_POINT: 5,
} as const;
