# Security Specification — Block Blast! OST

## 1. Data Invariants
1. **Owner-Only Private Progress**: `/users/{userId}` and `/users/{userId}/topicProgress/{topicId}` contain user email and personal save state; only `request.auth.uid == userId` with verified email may read or write.
2. **PII Isolation**: `/leaderboard/{userId}` stores zero PII (`uid`, `displayName`, `highScore`, `ostCorrectCount`, `ostAttemptedCount`, `adventureLevel`, `updatedAt`) and never stores `email`.
3. **Immutable Identity & Timestamps**: `uid` and `createdAt` are immutable after creation; `updatedAt` must equal `request.time`.
4. **No Ghost Fields**: Every `create` checks `hasAll` + `hasOnly`; every `update` uses action-based `affectedKeys().hasOnly(...)` combined with `isValid[Entity](incoming())`.
5. **Bounded Numerics & Strings**: Scores bounded `0..10000000`, OST counts bounded `0..1000000`, strings bounded with `.size()` and regex ID checks.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/users/userA`
2. Authenticated `userB` reading `/users/userA` (PII leak attempt)
3. Authenticated `userA` creating `/users/userA` with `uid: "userB"` (identity spoofing)
4. Authenticated `userA` creating `/users/userA` with ghost field `isAdmin: true` (shadow field)
5. Authenticated `userA` updating `/users/userA` changing `createdAt` or `uid` (immortal field tampering)
6. Authenticated `userA` writing `/users/userA` with client-forged `updatedAt` != `request.time`
7. Authenticated `userA` writing `/users/userA` with `classicHighScore: -50` or `999999999`
8. Authenticated `userA` writing `/users/userA/topicProgress/bad..id` (path variable poisoning)
9. Authenticated `userB` writing `/leaderboard/userA` (spoofing another player's score)
10. Authenticated `userA` writing `/leaderboard/userA` with `email: "a@b.com"` (PII injection into public leaderboard)
11. Authenticated `userA` writing `/leaderboard/userA` with `displayName` > 60 chars (resource poisoning)
12. Unverified email user writing to `/leaderboard/userA` (`email_verified == false`)
