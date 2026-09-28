# Going online

How Sumday grows from a single-player web game into an account-backed one with
leaderboards, leagues and duels - and what has to be true for that to be safe.

Nothing here is built yet. This is the plan, written while the client is still small
enough to shape around it.

---

## 1. The idea: the server never stores a puzzle

A puzzle is a pure function of `{ seed, difficulty }`. `journey-12` is the same 5x9 grid
with the same numbers and the same blanks on every device, forever - and on the server,
because `@sumday/engine` is a zero-dependency package that runs unchanged in Node.

So the backend does not store puzzles, ship puzzles, or trust puzzles. It stores a seed
(often it does not even need to: `journey-12` and `daily-2026-09-28` are derived from the
level number and the date) and regenerates whatever it needs, whenever it needs it:

```ts
import { generatePuzzle, dailyPuzzle, validateSolution } from '@sumday/engine';

const puzzle = generatePuzzle(dailyPuzzle('2026-09-28')); // ~1 ms
const { valid } = validateSolution(puzzle, submitted.answers);
```

That one property is what makes everything below cheap:

| Feature | What it would normally need | What it needs here |
| --- | --- | --- |
| Daily challenge | A puzzle table, a scheduler, a CDN | A date string |
| Leaderboards | Storing the puzzle each score belongs to | The date |
| Async duels | Generating and storing a shared puzzle | A duel id used as the seed |
| Replays / verification | Storing the board state | Re-running the generator |
| Anti-cheat | Heuristics on scores | Actually re-solving the puzzle |

**The engine is the shared contract.** The API imports the exact same package the client
does. It is already ESM with `.js` import extensions, exactly like your other backends, so
it drops in with no build shim.

### 1.1 The one rule that protects all of this

> **A published seed must generate the same puzzle forever.**

Change `generatePuzzle`, `buildLayout`, `fillValues`, `chooseBlanks`, the RNG, or the
difficulty table, and every historical seed produces a different puzzle. Yesterday's
leaderboard becomes unverifiable, and a player's saved daily result no longer matches the
puzzle they solved.

Three things keep that from happening by accident:

1. **Pin the generation version in the seed, not the package version.** When generation has
   to change, change the seed namespace with it: `journey-12` → `j2-12`,
   `daily-2026-09-28` → `d2-2026-09-28`. Old seeds keep resolving through the old path,
   which stays in the package. Uglier than a clean rewrite, and the only thing that keeps
   old results meaningful.
2. **Record `engineVersion` on every stored result.** Cheap, and it makes "why does this old
   row not validate" answerable instead of mysterious.
3. **Add a golden-fixture test to the engine now, before any of this ships.** A file of
   pinned puzzles for ~40 seeds across all four difficulties, compared byte-for-byte. Any
   change to generation fails that test loudly instead of silently invalidating history.
   This is worth doing as a small task ahead of the API - it costs an afternoon and it is
   the thing most likely to be discovered too late.

---

## 2. Anti-cheat

The client is not trustworthy. It is a bundle of JavaScript on someone else's machine, and
everything it reports can be edited. The question is never "can we stop cheating" but
"which numbers can the server establish on its own".

### 2.1 What the server can and cannot know

| Value | Verifiable? | How |
| --- | --- | --- |
| The answers are correct | **Yes** | Regenerate the puzzle, run `validateSolution` |
| The answers use exactly the tiles given | **Yes** | `validateSolution` checks the multiset too |
| Solve time | **Yes, with a run token** (below) | Server measures start → submit |
| Hints used | **Yes, once hints are server-held** | Hints are spent through the API |
| Mistakes made | **No** | Nothing observable distinguishes a careful player from a liar |

Mistakes are the honest gap. A player who under-reports mistakes gains stars. That is
tolerable for journey levels, where the only person affected is the player. It is not
tolerable for a leaderboard, which is why **competitive rankings are ordered by
server-measured time, never by self-reported stars.**

### 2.2 Run tokens

For anything competitive, a run is opened on the server before it starts:

```
POST /api/runs            { "mode": "daily", "ref": "2026-09-28" }
  → 201 { "runId": "run_9f2…", "seed": "daily-2026-09-28", "difficulty": "easy",
          "startedAt": "2026-09-28T09:14:02.310Z" }
```

- The **server** decides the seed from the mode and reference. The client never proposes one.
- The server records `startedAt`. Solve time is `submittedAt - startedAt`, so it cannot be
  under-reported - only inflated, which nobody wants to do.
- Hints are spent against the run (`POST /api/runs/:id/hint`), so hint counts are
  server-side facts and the hint balance cannot be forged.
- One open run per player per reference. A second `POST` returns the existing run, so
  refreshing the page does not reset the clock or open a second timer.

**This is the one place the plan fights offline-first.** A run token needs a network round
trip before play begins. The resolution:

- **Journey levels never need one.** They stay fully offline and optimistic; results sync
  later. Cheating there only affects your own star count.
- **Daily, duels and events need one.** If the client cannot reach the API it still lets
  you play - the engine is local, the puzzle is right there - but the result is marked
  `offline: true`, counts for your own streak and coins, and is **not** eligible for the
  leaderboard. The UI has to say that up front, not after the fact.

### 2.3 Plausibility checks

Even with a server clock, a bot can solve a puzzle correctly in 400 ms. So on submit:

```ts
const floorMs = puzzle.blanks.length * MIN_MS_PER_BLANK; // start around 350 ms
const suspicious = elapsedMs < floorMs;
```

A suspicious result is **stored and accepted for the player's own progress, and excluded
from public boards**, with a flag. Never a hard rejection: a fast, legitimate player on an
easy puzzle should not lose their streak to a heuristic. Tune `MIN_MS_PER_BLANK` against
the real distribution once there is one - and log the percentile so the threshold is a
decision rather than a guess.

Second layer: a per-player daily submission rate limit, and an outlier check against the
day's own distribution (flag anything below the 0.1st percentile for review).

### 2.4 Coins are server-authoritative once an account exists

Today the client adds coins locally. The moment there are accounts, that flips: the server
computes the reward from the verified result and returns the new balance. The client's
number becomes a cache that the server can correct at any time. A local balance is only
ever trusted once - at the moment of linking (§4.2).

---

## 3. Accounts: guest first

Nobody should meet a sign-up wall before their first puzzle.

1. **First launch.** The client generates a `deviceId` (UUID v4) and stores it with the
   save. No network, no account, everything works.
2. **First sync need** (or a tap on "Save my progress"). The client registers the device:
   `POST /api/auth/guest { deviceId }` returns a `User` row with `isGuest: true` and a
   token pair. Progress starts syncing. Still no email, still no password.
3. **Linking.** `POST /api/auth/link { email, password }` attaches credentials to the
   existing user row and flips `isGuest` to false. The user id never changes, so no data
   moves and nothing is lost.
4. **Signing in elsewhere.** `POST /api/auth/login` on a second device produces the merge in
   §4.2.

A guest account is a real account with no way back in if the device is lost. The UI has to
be honest about that - one line on the home screen once there is meaningful progress, not a
nag.

### 3.1 Auth mechanics

Same shape as `seenjeem-clone-backend` and `scheduallyio-backend`:

- **Express 5**, ESM, `src/domains/<name>/{name}.route.ts, .controller.ts, .schema.ts`,
  shared code in `src/common/libs` and `src/common/middlewares`.
- **bcrypt** (cost 12) in `common/libs/password.ts`.
- **jsonwebtoken** in `common/libs/jwt.ts`, as specified. Worth noting: your newest backend
  moved to `jose`, which is ESM-native and has no CommonJS interop wrinkle. If that move was
  deliberate, make it here too - this is a greenfield service.
- **Access token**: 15 minutes, `{ sub, isGuest }`, held in memory by the client.
- **Refresh token**: 30 days, rotating, stored **hashed** in `RefreshToken`, delivered as an
  httpOnly `SameSite=Lax` cookie on web and in secure storage under Capacitor. Rotation
  detects reuse: a refresh token presented twice revokes the whole family.
- **zod** schemas per domain for request validation, `requireAuth` middleware, central
  `error.middleware.ts` mapping `AppError` to status codes.

On the client this is one new implementation of an interface that already exists:
`ApiSaveAdapter implements SaveAdapter`, bound in `app.config.ts`. No page, store or
component changes.

---

## 4. Cloud save

### 4.1 The sync shape

```
GET  /api/progress          → the server's current state + revision
PUT  /api/progress          → { state, baseRevision } → merged state + new revision
```

The client keeps writing locally first (`LocalSaveAdapter` stays the write-through cache)
and pushes in the background. A failed push changes nothing the player can see.

**Every field in the save merges without a conflict**, which is the nice consequence of how
progress is shaped. There is no need for vector clocks or last-write-wins on the record as
a whole:

| Field | Merge rule |
| --- | --- |
| `levels[n].stars` | `max` |
| `levels[n].bestTimeMs` | `min` |
| `levels[n].mistakes` / `hintsUsed` | From whichever side set the better stars |
| `daily[date]` | Union by date; on collision, higher stars, then lower time |
| `streak` | **Recomputed** from the merged `daily` history, never taken from either side |
| `lastDailyDate` | `max(date)` present in the merged history |
| `sound`, settings | The client's |
| `coins`, `hints` | See below |

`streak` deserves the emphasis: it is **derivable** from `daily`, so deriving it removes a
whole class of divergence. That is worth doing in the client too, now, rather than storing
it - a small refactor that pays for itself the day sync lands.

### 4.2 Coins and hints: the one place merging is dangerous

Adding two balances is a duplication exploit: play offline on two devices, link both, print
money. Taking the max is exploitable too, but only once and only up to what a single device
could legitimately have earned.

- **At link time only:** `coins = max(local, cloud)`, same for hints. Log both values.
- **After that:** the server owns the balance. The client displays what the server last
  said, applies rewards optimistically for responsiveness, and accepts correction on the
  next sync.
- **A guest that has never synced** is the only case where a large local balance is
  plausible, so a one-time max at link is the right amount of trust.

---

## 5. What to build, in order

Each step is shippable on its own and earns the right to the next one.

### 5.1 Cloud save

*Why first:* it is the only one the others cannot be built without, and it is the feature
players actually ask for ("I lost everything when I cleared my browser").

*Needs:* auth, `User`, `Progress`, `LevelResult`, `DailyResult`, the merge rules above,
`ApiSaveAdapter`.

*Risk:* the merge is the whole feature. Write the merge as a pure function with its own
tests before any HTTP exists - it is the part that quietly destroys progress if it is wrong.

### 5.2 Daily leaderboard, global and by country

*Why second:* the daily already exists, it is the natural competitive surface, and it is
what makes the streak feel like it is worth something.

*Design:*

- Rank by **server-measured time**, ascending. Mistakes and hints are shown next to a row
  but do not order it (§2.1). Do not invent a composite score out of numbers the server
  cannot verify.
- `countryCode` comes from GeoIP at submission time and is **stored on the row**, never sent
  by the client. It is a property of the submission, not of the account, so it does not
  change retroactively when someone travels.
- Start with Postgres: an index on `(date, timeMs)` and a window function for "my rank" is
  fine well past the point this game is likely to reach. Reach for Redis sorted sets when a
  measurement says to, not before.
- Exclude `flagged` and `offline` rows from the public board; the player still sees their
  own.

*Risk:* the first cheater arrives the day this ships. Run tokens (§2.2) must be in place
**before** it, not after.

### 5.3 Weekly leagues

*Why third:* a leaderboard rewards the best player in the world. A league rewards you, which
is what actually retains people.

*Design:* buckets of ~30 players of similar recent activity, a Bronze → Silver → Gold →
Ruby → Diamond ladder, top 7 promoted and bottom 7 relegated each week. Points come from
daily and journey play during the week. A Monday 00:00 UTC cron closes the week, pays out,
and assigns new buckets.

*Risk:* the cron is now load-bearing and runs once a week, which means a bug in it is found
a week late. It needs to be idempotent and replayable for a given week, and it needs a dry
run.

### 5.4 Async duels

*Why fourth:* the first social feature, and the one determinism makes nearly free - both
players get `duel-<id>` as their seed and there is nothing to store but two results.

*Flow:* challenge (by code or from a friends list) → accept → both play the same seed within
48 hours → resolve by time, then fewer mistakes, then earlier submission.

*Design detail that matters:* the second player must not see the first player's time before
submitting, or the duel becomes "solve it in under 1:12" instead of a race. The API hides
the opponent's result until your own run is submitted or the duel expires.

*Risk:* the incentive to cheat is much higher one-on-one than on a global board where you
were never going to be first anyway. Duels are run-token-only, no exceptions, no offline
fallback.

### 5.5 Realtime duels (Socket.IO)

*Why fifth:* it is the first feature with genuinely new infrastructure - sticky sessions, a
connection state machine, reconnect handling - and it is worth confirming people want duels
at all before paying for that.

*Design:* the server assigns the seed and owns the clock. Clients emit progress as
**counts, not values** (`{ filled: 4, mistakes: 1 }`), so an intercepted socket message
never leaks answers. Reconnect within 30 seconds resumes; beyond that it is a forfeit. The
result still goes through the normal submit path, so verification is identical to every
other mode.

*Risk:* horizontal scaling needs the Socket.IO Redis adapter, and the deploy target needs
websockets and sticky sessions. Check that before designing around it.

### 5.6 Limited-time events

*Why sixth:* a retention lever that reuses everything already built. An event is a set of
seeds (`event-<slug>-<n>`), a window, and a reward track.

*Needs:* `Event` and `EventProgress`, plus a way to define an event without a deploy - which
is the natural bridge to the last item.

### 5.7 Remote config

*Why last:* it is only worth anything once there is enough traffic for a change to be
measurable, and it is the most dangerous thing on this list - it lets production behaviour
change without a code review.

*Design:*

- The client already keeps every tunable number in `core/config/economy.ts`. That file stays
  and becomes the **fallback**: if the config endpoint is unreachable or returns something
  unexpected, the bundled values are used and the game plays exactly as it does today.
- `GET /api/config` with an `ETag`, cached locally, refreshed on launch.
- **Only whitelisted keys are applied**, validated against a zod schema client-side. A typo
  in a config row must not be able to set a hint price to zero or a level count to `NaN`.
- Every change is audited: who, when, from what to what.

---

## 6. Draft Prisma schema

Postgres, Prisma 7 with `@prisma/adapter-pg`, matching your other backends: camelCase
fields, `@@map` to snake_case tables, `uuid()` ids.

Prisma 7 no longer accepts `url = env(...)` in the schema - the connection string moves to
`prisma.config.ts`, the same way `seenjeem-clone-backend` already does it:

```ts
// prisma.config.ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env['DATABASE_URL']! },
});
```

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String   @id @default(uuid())
  /// Null until the account is linked; a guest is a real account with no way back in.
  email        String?  @unique
  passwordHash String?
  displayName  String
  /// Stable per install, used to adopt an existing guest on reinstall.
  deviceId     String?  @unique
  isGuest      Boolean  @default(true)
  /// From GeoIP at registration. A hint for league seeding, not a source of truth.
  countryCode  String?  @db.Char(2)
  createdAt    DateTime @default(now())
  lastSeenAt   DateTime @default(now())

  progress      Progress?
  levelResults  LevelResult[]
  dailyResults  DailyResult[]
  runs          Run[]
  purchases     Purchase[]
  eventProgress EventProgress[]
  refreshTokens RefreshToken[]
  duelsAsA      Duel[]          @relation("DuelPlayerA")
  duelsAsB      Duel[]          @relation("DuelPlayerB")

  @@index([lastSeenAt])
  @@map("users")
}

/// The scalar part of the save. Level and daily history live in their own tables
/// so they can be queried, ranked and merged row by row.
model Progress {
  userId        String   @id
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  coins         Int      @default(100)
  hints         Int      @default(3)
  streak        Int      @default(0)
  lastDailyDate String?  @db.Char(10)
  settings      Json     @default("{}")
  /// Bumped on every accepted write; the client sends the revision it based its change on.
  revision      Int      @default(0)
  updatedAt     DateTime @updatedAt

  @@map("progress")
}

model LevelResult {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  level      Int
  stars      Int
  bestTimeMs Int
  mistakes   Int
  hintsUsed  Int
  /// Which generation produced the puzzle this result belongs to.
  engine     String
  clearedAt  DateTime @default(now())

  @@unique([userId, level])
  @@index([userId])
  @@map("level_results")
}

model DailyResult {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        String   @db.Char(10)
  stars       Int
  /// Server-measured where a run token existed, which is the only kind that ranks.
  timeMs      Int
  mistakes    Int
  hintsUsed   Int
  /// Snapshotted at submission: a property of the submission, not of the account.
  countryCode String?  @db.Char(2)
  /// True when the run had no server-side clock; kept for the player, hidden from boards.
  offline     Boolean  @default(false)
  /// Set by a plausibility check. Excluded from boards, never deleted.
  flagged     Boolean  @default(false)
  engine      String
  submittedAt DateTime @default(now())

  @@unique([userId, date])
  @@index([date, timeMs])
  @@index([date, countryCode, timeMs])
  @@map("daily_results")
}

/// An open, server-timed run. The backbone of every verifiable number.
model Run {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  mode        RunMode
  /// "2026-09-28" for a daily, "12" for a level, a duel id for a duel.
  ref         String
  seed        String
  difficulty  String
  hintsUsed   Int       @default(0)
  startedAt   DateTime  @default(now())
  submittedAt DateTime?

  @@unique([userId, mode, ref])
  @@index([userId, startedAt])
  @@map("runs")
}

enum RunMode {
  journey
  daily
  duel
  event
}

model Duel {
  id         String     @id @default(uuid())
  /// Short, shareable, case-insensitive.
  code       String     @unique
  /// The seed both players get: deterministic, so nothing about the board is stored.
  seed       String
  difficulty String
  playerAId  String
  playerA    User       @relation("DuelPlayerA", fields: [playerAId], references: [id])
  playerBId  String?
  playerB    User?      @relation("DuelPlayerB", fields: [playerBId], references: [id])
  aTimeMs    Int?
  aMistakes  Int?
  bTimeMs    Int?
  bMistakes  Int?
  winnerId   String?
  status     DuelStatus @default(open)
  createdAt  DateTime   @default(now())
  expiresAt  DateTime
  resolvedAt DateTime?

  @@index([status, expiresAt])
  @@index([playerAId])
  @@index([playerBId])
  @@map("duels")
}

enum DuelStatus {
  open
  active
  resolved
  expired
}

model Purchase {
  id           String           @id @default(uuid())
  userId       String
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform     PurchasePlatform
  productId    String
  /// The store's transaction id. Unique, so a replayed receipt cannot grant twice.
  externalId   String           @unique
  coinsGranted Int              @default(0)
  priceCents   Int?
  currency     String?          @db.Char(3)
  status       PurchaseStatus   @default(pending)
  /// The raw receipt, kept for re-verification and disputes.
  receipt      Json?
  createdAt    DateTime         @default(now())
  verifiedAt   DateTime?

  @@index([userId])
  @@map("purchases")
}

enum PurchasePlatform {
  apple
  google
  web
}

enum PurchaseStatus {
  pending
  verified
  refunded
  invalid
}

model EventProgress {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventSlug   String
  /// Which of the event's seeds are done.
  stagesDone  Int      @default(0)
  points      Int      @default(0)
  claimedTier Int      @default(0)
  updatedAt   DateTime @updatedAt

  @@unique([userId, eventSlug])
  @@index([eventSlug, points])
  @@map("event_progress")
}

/// Rotating refresh tokens, stored hashed. Reuse revokes the whole family.
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  familyId  String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}

/// Needed by §5.3. Listed here so the league cron has somewhere to write.
model LeagueMembership {
  id        String @id @default(uuid())
  userId    String
  /// ISO week, "2026-W40".
  week      String
  tier      Int
  bucketId  String
  points    Int    @default(0)
  finalRank Int?

  @@unique([userId, week])
  @@index([week, bucketId, points])
  @@map("league_memberships")
}
```

Note what is **not** in there: no `Puzzle`, no `Board`, no `Cell`, no `Equation`. That is the
whole point.

---

## 7. REST API

`/api` prefix, domains matching your existing layout:
`src/domains/{auth,progress,runs,results,leaderboard,duels,events,config}`.

### Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/guest` | `{ deviceId }` | `{ user, accessToken }` + refresh cookie |
| POST | `/auth/register` | `{ email, password, displayName }` | `{ user, accessToken }` |
| POST | `/auth/link` | `{ email, password }` | `{ user }` - attaches credentials to the current guest |
| POST | `/auth/login` | `{ email, password }` | `{ user, accessToken }` |
| POST | `/auth/refresh` | – (cookie) | `{ accessToken }`, rotates the refresh token |
| POST | `/auth/logout` | – | `204`, revokes the family |
| GET | `/auth/me` | – | `{ user }` |

### Progress

```
GET /api/progress
→ 200 {
    "revision": 41,
    "progress": { "coins": 260, "hints": 4, "streak": 5, "settings": { "sound": true } },
    "levels": { "1": { "stars": 3, "bestTimeMs": 41200, "mistakes": 0, "hintsUsed": 0 } },
    "daily":  { "2026-09-28": { "stars": 2, "timeMs": 74210 } }
  }
```

```
PUT /api/progress
{ "baseRevision": 41, "progress": { … }, "levels": { … }, "daily": { … } }

→ 200 { "revision": 42, …merged state… }   // always the merged result, never a 409:
                                            // every field merges (§4.1)
```

### Runs and results

```
POST /api/runs
{ "mode": "daily", "ref": "2026-09-28" }
→ 201 { "runId": "run_9f2…", "seed": "daily-2026-09-28", "difficulty": "easy",
        "startedAt": "2026-09-28T09:14:02.310Z" }
→ 200 …the same body, if a run is already open for that reference

POST /api/runs/:runId/hint
→ 200 { "hintsRemaining": 2, "cellKey": "4,2", "value": 7 }
   // The server runs getHint() itself, so a hint cannot be taken without paying for it.

POST /api/runs/:runId/submit
{ "answers": { "0,4": 12, "4,2": 7, "4,4": 19 }, "mistakes": 1 }

→ 201 {
    "accepted": true,
    "stars": 2,
    "timeMs": 74210,          // server-measured
    "hintsUsed": 0,           // server-counted
    "coins": 30,              // server-computed
    "balance": { "coins": 290, "hints": 2 },
    "streak": 6,
    "rank": { "global": 1423, "country": 37 }
  }
→ 409 { "accepted": false, "reason": "already-submitted" }
→ 422 { "accepted": false, "reason": "wrong-answers" }
→ 202 { "accepted": true, "flagged": true, "reason": "implausible-time", … }
```

Journey levels skip the run token entirely and post their result with the progress sync -
there is nothing competitive to protect.

### Leaderboard

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| GET | `/leaderboard/daily/:date` | `scope=global\|country`, `cursor`, `limit` | `{ entries: [{ rank, displayName, countryCode, timeMs, stars }], nextCursor }` |
| GET | `/leaderboard/daily/:date/me` | `scope` | `{ rank, total, entry }` |

### Duels

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/duels` | `{ difficulty }` | `{ duel }` with a join `code` |
| POST | `/duels/join` | `{ code }` | `{ duel }` |
| GET | `/duels/:id` | – | `{ duel }` - the opponent's result is `null` until yours is in |
| GET | `/duels` | `status` | `{ duels: [...] }` |

### Config

```
GET /api/config
→ 200 { "version": 7, "economy": { … only whitelisted keys … } }   // ETag-cached
```

---

## 8. Going mobile, and money

### 8.1 Capacitor

The web build is already mobile-first, works offline, and makes no network calls in the
gameplay path, which is most of the work:

```bash
npm i -D @capacitor/cli && npm i @capacitor/core
npx cap init Sumday com.yourdomain.sumday --web-dir=apps/web/dist/sumday-web/browser
npx cap add ios android
```

Three things to fix up before the first device build:

1. **Self-host the fonts.** The web build links Google Fonts from a CDN, which fails inside
   a packaged app. Download the two woff2 files into `apps/web/public/fonts` and declare
   `@font-face` locally. This is the only known hard blocker.
2. **Safe areas.** The top bar and the tray need `env(safe-area-inset-*)` padding. The
   viewport meta already has `viewport-fit=cover`.
3. **Back button** on Android should pop the router, not exit the app.

### 8.2 Rewarded ads

`FakeAdsService` already has the shape the real one needs: `showRewarded()` returning a
promise that resolves true when the reward is earned.

- `@capacitor-community/admob`, bound in `app.config.ts` in place of `FakeAdsService`.
- The hint flow, the daily cap of 3, and the sheet UI do not change at all.
- Once accounts exist the grant moves server-side (`POST /api/hints/reward` with the
  network's server-side verification callback), because a client-side "I watched it" is
  worth nothing.

### 8.3 In-app purchases

`UnavailablePurchaseService` lists the products and disables them; the real one swaps in.

- RevenueCat is worth the cut for one developer - it handles both stores, receipt
  validation, and restores. Rolling it by hand means writing Apple and Google receipt
  verification twice and maintaining them.
- **Never grant from the client.** The store receipt goes to `POST /api/purchases/verify`,
  the server validates it with the store, writes a `Purchase` row keyed on the store's
  transaction id (unique, so a replayed receipt cannot grant twice), and returns the new
  balance.
- Restore purchases is a requirement for both stores, not a nice-to-have.

### 8.4 Web portals: Poki and CrazyGames

The web build can earn on its own, and it is the cheapest distribution there is.

- Both require their SDK, which is loaded from **their** domain and expects ad break hooks
  (`gameplayStart` / `gameplayStop`, `commercialBreak`, `rewardedBreak`). Those map onto
  the same `AdsService` interface - a `PokiAdsService` implementation and nothing else
  changes.
- Their SDK conflicts with the current "no external requests" property, so it belongs
  behind a build configuration (`ng build --configuration=poki`), not in the default bundle.
- They generally want: no external links, no cross-promotion, no account wall, instant load,
  and a working mute. The first four are already true.
- Expect a review pass on load time. The initial bundle is ~75 kB transferred today, which
  is comfortably inside what they ask for.

---

## 9. Invariants

Things that must stay true, and are easy to break by accident:

1. **A published seed generates the same puzzle forever.** (§1.1)
2. **The engine has zero dependencies and no platform APIs.** The moment it imports
   something Node-only or DOM-only, the client and server stop being able to share it.
3. **The server regenerates; it never accepts a puzzle from the client.**
4. **Nothing competitive is ranked on a number the client reported.**
5. **Coins are granted by whoever is authoritative - local before accounts, the server
   after - never by both.**
6. **A failed network call never blocks play.** Everything online is an enhancement layered
   on a game that already works offline.

## 10. Open questions

- **Display names.** Needed for leaderboards, which means moderation, uniqueness rules, and
  a reporting path. Cheapest credible answer: generated two-word names with a rename that
  costs coins.
- **GDPR / account deletion.** `onDelete: Cascade` covers the data; the leaderboard needs a
  tombstone so ranks do not silently renumber.
- **Children's privacy.** Puzzle games attract under-13 players. COPPA and the app stores
  care about this and it shapes ads, analytics and account linking. Decide before the first
  store submission, not after.
- **Where it runs.** Realtime duels (§5.5) need websockets and sticky sessions; that
  constrains the host more than anything else here.
