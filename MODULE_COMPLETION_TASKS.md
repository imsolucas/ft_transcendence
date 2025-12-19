# Module Completion Tasks

**Project:** ft_transcendence  
**Current Status:** 16/25 points completed (exceeds 14-point minimum)  
**Remaining:** 9 points in progress  
**Last Updated:** December 18, 2024

---

## 📊 Current Status Summary

### ✅ Completed Modules (16 points)
- **Major (10 points):** Framework Usage, Real-time Features, User Interaction System, Microservices Architecture, Standard User Management
- **Minor (6 points):** Frontend Framework, Backend Framework, ORM, Custom Design System, Multiple Languages, Browser Support

### 🚧 In Progress Modules (9 points)
- **Major (4 points):** Public API, Multiplayer Game
- **Minor (5 points):** Game Statistics, OAuth 2.0, 2FA System, Tournament System, Health Check System

---

## 🎯 Module Completion Tasks

### 1. Public API (Major - 2 points) 🚧

**Status:** Not started - No API key auth or rate limiting found  
**Priority:** High (2 points)  
**Estimated Time:** 4-6 hours

#### Required Tasks:

- [ ] **Implement 5+ REST API endpoints** (separate from authenticated user endpoints)
  - [ ] `GET /api/v1/users` - List users (paginated, public)
  - [ ] `POST /api/v1/users` - Create user (if needed for public API)
  - [ ] `GET /api/v1/users/:id` - Get user by ID (public profile)
  - [ ] `PUT /api/v1/users/:id` - Update user (if applicable)
  - [ ] `DELETE /api/v1/users/:id` - Delete user (if applicable)
  - [ ] Additional endpoint(s) as needed (matches, tournaments, leaderboard)

- [ ] **API Key Authentication**
  - [ ] Create API key model in database schema
  - [ ] API key generation endpoint (`POST /api/v1/api-keys`)
  - [ ] API key validation middleware (`services/users/src/middleware/apiKeyAuth.ts`)
  - [ ] API key storage in database with user association
  - [ ] API key scoping/permissions (read, write, admin)
  - [ ] API key revocation endpoint (`DELETE /api/v1/api-keys/:id`)
  - [ ] User dashboard to view/manage API keys

- [ ] **Rate Limiting**
  - [ ] Install rate limiting library (e.g., `@fastify/rate-limit`)
  - [ ] Per IP address rate limiting middleware
  - [ ] Per API key rate limiting (different limits for authenticated keys)
  - [ ] Configurable limits (requests per minute/hour/day)
  - [ ] Rate limit headers in responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
  - [ ] Proper error responses (429 Too Many Requests)
  - [ ] Rate limit storage (in-memory or Redis)

- [ ] **API Documentation**
  - [ ] Install Swagger/OpenAPI plugin (`@fastify/swagger`, `@fastify/swagger-ui`)
  - [ ] Configure OpenAPI specification
  - [ ] Document all public API endpoints with request/response schemas
  - [ ] Include authentication requirements (API key)
  - [ ] Include rate limit information in docs
  - [ ] Include example requests/responses
  - [ ] Accessible at `/docs` or `/api-docs`

- [ ] **Testing**
  - [ ] Test all endpoints with API keys
  - [ ] Test rate limiting (verify 429 responses at limit)
  - [ ] Test API key generation and revocation
  - [ ] Test without API key (should fail with 401)
  - [ ] Verify Swagger documentation accuracy
  - [ ] Test different API key scopes/permissions

**Files to Create/Modify:**
- `services/users/src/db/prisma/schema.prisma` (add ApiKey model)
- `services/users/src/routes/apiRoutes.ts` (create - public API routes)
- `services/users/src/middleware/apiKeyAuth.ts` (create - API key validation)
- `services/users/src/middleware/rateLimiter.ts` (create - rate limiting)
- `services/users/src/controllers/apiControllers.ts` (create - API endpoints)
- `services/users/src/app.ts` (register API routes, swagger)
- Run migrations: `npx prisma migrate dev --name add_api_keys`

**Current State:**
- ✅ User endpoints exist (`/user/*`) but these are authenticated (JWT), not public API
- ❌ No API key authentication system
- ❌ No rate limiting implemented
- ❌ No Swagger/OpenAPI documentation
- ❌ No separate public API endpoints

---

### 2. Multiplayer Game (Major - 2 points) 🚧

**Status:** Tournament UI exists, 3+ player game logic needs verification  
**Priority:** High (2 points)  
**Estimated Time:** 4-6 hours

#### Required Tasks:

- [ ] **Verify 3+ Player Game Logic**
  - [ ] Test game with 3 players simultaneously
  - [ ] Test game with 4-8 players (tournament mode)
  - [ ] Verify server-authoritative game logic (all decisions on server)
  - [ ] Verify player input validation and sanitization
  - [ ] Verify fair gameplay mechanics for all participants
  - [ ] Handle player join/leave during game
  - [ ] Reconnection support for disconnected players

- [ ] **Game State Synchronization**
  - [ ] Real-time state updates via WebSocket for 3+ players
  - [ ] Delta updates (only send changes, not full state)
  - [ ] Full state snapshots periodically (every N ticks)
  - [ ] Handle network latency and packet loss
  - [ ] Client-side prediction (optional, for smoother gameplay)
  - [ ] Server reconciliation for authoritative state

- [ ] **Game Loop & State Machine**
  - [ ] States: waiting → starting → playing → finished
  - [ ] Game initialization for 3+ players (not just 2)
  - [ ] Tick-based or event-based updates
  - [ ] Consistent update frequency (e.g., 60 ticks per second)
  - [ ] Game end conditions and winner determination (for 3+ players)

- [ ] **Testing**
  - [ ] Test with 3 players simultaneously
  - [ ] Test with 4-8 players (tournament mode)
  - [ ] Test player disconnection/reconnection
  - [ ] Test game state synchronization
  - [ ] Verify fair gameplay mechanics
  - [ ] Verify anti-cheat (server validates all moves)

**Files to Verify/Modify:**
- `services/game/src/game/GameEngine.ts` (verify 3+ player support)
- `services/game/src/websocket/GameHandler.ts` (verify WebSocket handling for 3+)
- `services/game/src/websocket/TournamentService.ts` (verify tournament game logic)
- `services/frontend/src/game/GameClient.ts` (verify frontend handles 3+ players)

**Current State:**
- ✅ Tournament UI structure exists
- ✅ WebSocket implementation exists
- ✅ Database schema supports tournaments
- ❓ Need to verify actual 3+ player gameplay works
- ❓ Need to verify tournament bracket games function correctly

---

### 3. Game Statistics (Minor - 1 point) 🚧

**Status:** Database schema ready, match history endpoint may exist, calculations pending  
**Priority:** Medium (1 point)  
**Estimated Time:** 3-4 hours

#### Required Tasks:

- [ ] **Statistics Calculation**
  - [ ] Verify/implement wins count from match history
  - [ ] Verify/implement losses count from match history
  - [ ] Win/loss ratio calculation
  - [ ] Ranking/ELO calculation (if implemented, otherwise skip)
  - [ ] Level/progression calculation (if implemented, otherwise skip)
  - [ ] Total games played count
  - [ ] Average game duration calculation
  - [ ] Total playtime calculation

- [ ] **Match History**
  - [ ] Verify/implement complete match history endpoint (`GET /user/match-history`)
  - [ ] Filter by date range (optional)
  - [ ] Filter by game mode (1v1, tournament)
  - [ ] Include opponent information
  - [ ] Include match duration
  - [ ] Include match results (win/loss, score)
  - [ ] Pagination support

- [ ] **Leaderboard Integration**
  - [ ] Leaderboard endpoint (`GET /game/leaderboard`)
  - [ ] Top players by wins
  - [ ] Top players by win rate (minimum N games)
  - [ ] Top players by ranking/ELO (if ELO implemented)
  - [ ] Tournament winners
  - [ ] Periodic leaderboard updates (cache if needed)

- [ ] **Frontend Display**
  - [ ] Statistics display in profile page
  - [ ] Match history list UI
  - [ ] Leaderboard page/component
  - [ ] Visual charts/graphs (optional, for extra polish)

**Files to Create/Modify:**
- `services/users/src/controllers/statsControllers.ts` (create - statistics logic)
- `services/users/src/routes/statsRoutes.ts` (create - statistics endpoints)
- `services/game/src/routes/leaderboardRoutes.ts` (create - leaderboard endpoint)
- `services/frontend/src/utils/api.ts` (add stats/leaderboard functions)
- `services/frontend/src/pages/profilePage.ts` (add stats display)
- `services/frontend/src/pages/leaderboardPage.ts` (create - leaderboard UI)

**Current State:**
- ✅ Database schema has Match model with winner tracking
- ✅ Match history endpoint may exist (`/user/match-history` - need to verify)
- ❌ Statistics calculations likely not implemented
- ❌ Leaderboard endpoint likely not implemented
- ❌ Frontend statistics display likely incomplete

---

### 4. OAuth 2.0 (Minor - 1 point) 🚧

**Status:** Google OAuth partially implemented (frontend buttons exist, backend endpoint exists)  
**Priority:** Medium (1 point)  
**Estimated Time:** 2-4 hours

#### Required Tasks:

- [ ] **Complete Google OAuth**
  - [ ] Verify Google OAuth flow works end-to-end (test login)
  - [ ] Verify OAuth callback properly handles authorization code
  - [ ] Store OAuth provider user IDs in database (add `googleId` field to User model)
  - [ ] Link OAuth accounts to existing users (by email matching)
  - [ ] Handle case where user exists but no OAuth account linked
  - [ ] Test login with Google account
  - [ ] Test registration with Google account (create new user)

- [ ] **GitHub OAuth** (if time permits)
  - [ ] Register GitHub OAuth app (or use existing)
  - [ ] Implement GitHub OAuth flow (similar to Google)
  - [ ] Add `githubId` field to User model
  - [ ] Handle GitHub callback
  - [ ] Test login with GitHub account

- [ ] **42 OAuth** (optional - only if required)
  - [ ] Register 42 OAuth app (if applicable)
  - [ ] Implement 42 OAuth flow
  - [ ] Add `fortyTwoId` field to User model
  - [ ] Handle 42 callback
  - [ ] Test login with 42 account

- [ ] **OAuth Account Linking**
  - [ ] Allow users to link multiple OAuth providers (from settings)
  - [ ] Display linked accounts in profile/settings
  - [ ] Allow unlinking accounts (with password confirmation)
  - [ ] Prevent duplicate account creation (check email/provider ID)

- [ ] **Frontend Integration**
  - [ ] OAuth buttons already exist in auth page ✅
  - [ ] Verify OAuth redirects work correctly
  - [ ] Display linked accounts in settings (if settings page exists)
  - [ ] Error handling for OAuth failures
  - [ ] Loading states during OAuth flow

**Files to Modify:**
- `services/users/src/db/prisma/schema.prisma` (add `googleId`, `githubId`, `fortyTwoId` fields)
- `services/users/src/controllers/authControllers.ts` (verify/complete Google OAuth)
- `services/users/src/routes/authRoutes.ts` (verify Google OAuth route exists)
- `services/frontend/src/services/google.ts` (verify Google OAuth integration)
- Run migrations: `npx prisma migrate dev --name add_oauth_ids`

**Current State:**
- ✅ Google OAuth frontend buttons exist
- ✅ Google OAuth backend endpoint likely exists (`/auth/google`)
- ✅ Frontend Google service exists
- ❓ Need to verify Google OAuth works end-to-end
- ❌ OAuth provider IDs not stored in database (need to add fields)
- ❌ GitHub OAuth not implemented
- ❌ 42 OAuth not implemented
- ❌ OAuth account linking UI not implemented

---

### 5. 2FA System (Minor - 1 point) 🚧

**Status:** Database schema ready, login verification modal exists, setup flow incomplete  
**Priority:** Medium (1 point)  
**Estimated Time:** 4-5 hours

#### Required Tasks:

- [ ] **TOTP Implementation**
  - [ ] Verify TOTP secret generation works (speakeasy library)
  - [ ] Store TOTP secret securely (currently stored in database, consider encryption)
  - [ ] Verify TOTP code validation on login (login modal exists ✅)
  - [ ] Handle 2FA verification flow in login
  - [ ] Time window validation (30-second windows, allow ±1 window for clock skew)

- [ ] **QR Code Generation**
  - [ ] Verify QR code generation endpoint exists (`GET /user/2fa/setup`)
  - [ ] Generate QR code for TOTP setup (qrcode library)
  - [ ] Include issuer name ("ft_transcendence") and user email in QR code
  - [ ] Display QR code in frontend (settings page)
  - [ ] Allow manual secret entry as backup (show secret text)

- [ ] **2FA Management**
  - [ ] Enable 2FA endpoint (`POST /user/2fa/enable` with verification code)
  - [ ] Disable 2FA endpoint (`POST /user/2fa/disable` with password confirmation)
  - [ ] Verify 2FA code before enabling
  - [ ] Require password confirmation for disable
  - [ ] Update `is2FAEnabled` flag in database

- [ ] **Backup Codes**
  - [ ] Generate backup codes (8-10 codes) when enabling 2FA
  - [ ] Store backup codes securely (hashed, similar to passwords)
  - [ ] Allow backup code usage for login (in 2FA verification)
  - [ ] Display backup codes during setup (show once, warn user to save)
  - [ ] Regenerate backup codes endpoint (`POST /user/2fa/backup-codes/regenerate`)

- [ ] **Frontend UI**
  - [ ] 2FA setup page/component (in settings)
  - [ ] QR code display component
  - [ ] 2FA code input form (already exists in login modal ✅)
  - [ ] Backup codes display (show once, allow copy/download)
  - [ ] Enable/disable 2FA toggle/buttons
  - [ ] 2FA verification modal on login (already exists ✅)

**Files to Create/Modify:**
- `services/users/src/controllers/twoFAControllers.ts` (verify/complete - 2FA logic)
- `services/users/src/routes/twoFARoutes.ts` (verify - 2FA routes)
- `services/users/src/utils/totp.ts` (verify - TOTP utilities)
- `services/frontend/src/pages/settingsPage.ts` (create/add - 2FA settings section)
- `services/frontend/src/components/2FA/SetupModal.ts` (create - 2FA setup UI)
- `services/frontend/src/components/2FA/BackupCodesDisplay.ts` (create - backup codes UI)

**Current State:**
- ✅ Database schema has `is2FAEnabled` and `twoFASecret` fields
- ✅ Login modal shows 2FA verification (if `is2FAEnabled` is true)
- ✅ Backend likely has 2FA setup endpoint
- ❓ Need to verify 2FA setup flow works end-to-end
- ❓ Need to verify QR code generation works
- ❌ Backup codes likely not implemented
- ❌ 2FA enable/disable UI likely not in settings page
- ❌ Backup codes display/regeneration likely not implemented

---

### 6. Tournament System (Minor - 1 point) 🚧

**Status:** Database schema ready, TournamentService exists, bracket logic needs verification  
**Priority:** Medium (1 point)  
**Estimated Time:** 4-6 hours

#### Required Tasks:

- [ ] **Bracket Generation**
  - [ ] Verify single elimination bracket algorithm works
  - [ ] Support 3-8 players (verify all cases work)
  - [ ] Seeding logic (if applicable, or random seeding)
  - [ ] Bracket visualization data structure
  - [ ] Round management (quarterfinals, semifinals, finals)
  - [ ] Handle byes (if odd number of players)

- [ ] **Tournament Management**
  - [ ] Verify tournament creation endpoint exists
  - [ ] Player registration for tournaments
  - [ ] Tournament status tracking (pending, running, finished, cancelled)
  - [ ] Automatic match creation from bracket
  - [ ] Tournament progression logic (advance winners to next round)

- [ ] **Match Scheduling**
  - [ ] Assign matches based on bracket
  - [ ] Track match results
  - [ ] Advance winners to next round automatically
  - [ ] Tournament winner determination
  - [ ] Handle tournament cancellation

- [ ] **Tournament History**
  - [ ] Store tournament results in database
  - [ ] Tournament history endpoint (`GET /game/tournaments`)
  - [ ] Display tournament winners
  - [ ] Tournament bracket replay (optional - show completed bracket)

- [ ] **Frontend Integration**
  - [ ] Tournament bracket visualization (verify it displays correctly)
  - [ ] Tournament registration UI (verify it works)
  - [ ] Tournament progress display (live updates)
  - [ ] Tournament history page

**Files to Verify/Modify:**
- `services/game/src/websocket/TournamentService.ts` (verify bracket generation logic)
- `services/game/src/routes/tournamentRoutes.ts` (verify tournament endpoints)
- `services/frontend/src/components/tournament/` (verify tournament UI components)
- `services/users/src/db/prisma/schema.prisma` (verify Tournament and TournamentPlayer models)

**Current State:**
- ✅ Database schema has Tournament and TournamentPlayer models
- ✅ TournamentService file exists
- ✅ Tournament UI components likely exist
- ❓ Need to verify bracket generation works for 3-8 players
- ❓ Need to verify tournament progression logic works
- ❓ Need to verify tournament matches are created and tracked correctly
- ❓ Need to test end-to-end tournament flow

---

### 7. Health Check System (Minor - 1 point) 🚧

**Status:** Basic `/health` endpoints exist, status page UI and backup procedures missing  
**Priority:** Low (1 point - quickest to complete)  
**Estimated Time:** 2-3 hours

#### Required Tasks:

- [ ] **Status Page UI**
  - [ ] Create status page component (`services/frontend/src/pages/statusPage.ts`)
  - [ ] Display all services' health status (users, game, chat, api-gateway)
  - [ ] Show database connectivity status (from health endpoint)
  - [ ] Show last check timestamp
  - [ ] Visual indicators (green/yellow/red)
  - [ ] Service uptime display (if available)
  - [ ] Auto-refresh status (every 30 seconds)

- [ ] **Enhanced Health Endpoints**
  - [ ] Verify `/health` endpoints in all services (users, game, chat)
  - [ ] Include database status in health check (verify DB connection)
  - [ ] Include dependency status (if applicable)
  - [ ] Return structured health data (JSON with status, timestamp, dependencies)
  - [ ] Health endpoint aggregation (API Gateway checks all services)

- [ ] **Backup Procedures**
  - [ ] Automated database backup script (`infra/backup.sh`)
  - [ ] Backup SQLite database file (`services/users/db/database.db`)
  - [ ] Backup scheduling (cron job or scheduled task)
  - [ ] Backup retention policy (keep last N backups)
  - [ ] Backup restoration procedure (document)
  - [ ] Test backup and restore process

- [ ] **Disaster Recovery**
  - [ ] Document disaster recovery procedures (`documents/DISASTER_RECOVERY.md`)
  - [ ] Service recovery procedures (how to restart failed services)
  - [ ] Data recovery procedures (restore from backup)
  - [ ] Rollback procedures (if deployment fails)

- [ ] **Monitoring (Optional)**
  - [ ] Health check monitoring dashboard (optional)
  - [ ] Alert system for service failures (optional)
  - [ ] Log aggregation (optional)

**Files to Create/Modify:**
- `services/frontend/src/pages/statusPage.ts` (create - status page UI)
- `services/frontend/src/utils/api.ts` (add health check functions)
- `services/users/src/routes/healthRoutes.ts` (enhance - add DB status)
- `services/game/src/routes/healthRoutes.ts` (verify/enhance)
- `services/chat/src/routes/healthRoutes.ts` (verify/enhance if exists)
- `infra/backup.sh` (create - backup script)
- `documents/BACKUP_PROCEDURES.md` (create - backup documentation)
- `documents/DISASTER_RECOVERY.md` (create - recovery documentation)
- `services/frontend/src/router/pageRegistry.ts` (add status page route)

**Current State:**
- ✅ Basic `/health` endpoints exist in services
- ✅ Docker health checks configured (in docker-compose.yml)
- ❌ Status page UI does not exist
- ❌ Health endpoints likely don't include detailed status (DB, dependencies)
- ❌ Backup procedures not implemented
- ❌ Disaster recovery documentation missing

---

## 📋 Priority Order (Recommended)

### Immediate (Before Evaluation - Quick Wins)
1. **Health Check System** (1pt) - 2-3 hours - Quickest completion, visual status page
2. **Public API** (2pts) - 4-6 hours - High value, 2 points, but requires significant work

### High Priority (Should Complete)
3. **Game Statistics** (1pt) - 3-4 hours - Relatively straightforward, good user value
4. **OAuth 2.0** (1pt) - 2-4 hours - Complete Google OAuth, verify it works
5. **2FA System** (1pt) - 4-5 hours - Complete setup flow, backup codes

### Medium Priority (Nice to Have)
6. **Tournament System** (1pt) - 4-6 hours - Verify bracket logic works end-to-end
7. **Multiplayer Game** (2pts) - 4-6 hours - Verify 3+ player gameplay works

---

## 🎯 Minimum Completion Goal

**To meet 14-point requirement:** ✅ Already met (16 points completed)

**To complete all selected modules (25 points):**
- Complete all 7 remaining modules
- Total estimated time: 23-35 hours

**Recommended approach for quickest completion:**
1. ✅ **Health Check System** (1pt, 2-3h) - Quick win, visual status page
2. ✅ **Game Statistics** (1pt, 3-4h) - Straightforward, good UX
3. ✅ **OAuth 2.0** (1pt, 2-4h) - Complete Google OAuth verification
4. ⚠️ **Public API** (2pts, 4-6h) - High value but requires API key system + rate limiting
5. ⚠️ **2FA System** (1pt, 4-5h) - Complete setup flow
6. ⚠️ **Tournament System** (1pt, 4-6h) - Verify bracket logic
7. ⚠️ **Multiplayer Game** (2pts, 4-6h) - Verify 3+ player gameplay

---

## ✅ Testing Checklist

For each completed module:

- [ ] Unit tests written (if applicable)
- [ ] Integration tests written (if applicable)
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error handling verified
- [ ] Documentation updated
- [ ] README.md updated with module status
- [ ] Tested in Chrome + 2 other browsers (Firefox, Safari/Edge)

---

## 📝 Notes

- All modules should be tested in Chrome, Firefox, and Safari/Edge
- All API endpoints should be documented in Swagger/OpenAPI
- All features should have proper error handling
- All user-facing features should support i18n (EN, ES, FR)
- All security features should follow best practices
- Database migrations should be run after schema changes
- Frontend build should succeed after all changes (`npm run build`)

---

## 🔍 Recent Work Completed (December 2024)

### Frontend Integration
- ✅ Friends page integrated with backend APIs (removed mock data)
- ✅ User search functionality implemented
- ✅ Profile page supports viewing own profile and other users' profiles
- ✅ Router supports query parameters for dynamic routing
- ✅ Lobby search functionality (searches users and navigates to profiles)
- ✅ All UI components created and actively used (Button, Input, Label, Modal, Card, Avatar, Badge, Dropdown, Toast, Spinner)

### Backend Integration
- ✅ `GET /user/profile/:username` endpoint for viewing other users' profiles
- ✅ `GET /user/search?q=` endpoint for searching users
- ✅ `DELETE /user/friends/:username` endpoint for removing friends
- ✅ Friend request endpoints (send, accept, reject)
- ✅ Improved error handling in search endpoint

---

**Last Updated:** December 18, 2024  
**Maintainer:** Development Team
