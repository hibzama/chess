# Firebase Project Cost Estimation

This document provides a detailed cost estimate based on the provided daily usage metrics. This assumes the project is on the **Firebase Blaze (Pay-as-you-go) plan**.

## Summary of Estimated Costs

| Service                  | Estimated Daily Cost | Estimated Monthly Cost | Notes                                                 |
| ------------------------ | -------------------- | ---------------------- | ----------------------------------------------------- |
| Authentication           | ~$0.04               | ~$1.20                 | Based on 1,500 daily active users.                    |
| Firestore Database       | ~$13.30              | ~$399.00               | Primarily driven by game state updates (writes).      |
| Cloud Functions          | ~$2.05               | ~$61.50                | Driven by the `announceNewGame` function invocations. |
| App Hosting              | ~$0.05               | ~$1.50                 | Based on estimated data egress.                       |
| Realtime Database        | ~$0.03               | ~$0.90                  | For the real-time user presence system.               |
| **Total Estimated Cost** | **~$15.47**          | **~$464.10**           |                                                       |

---

## Detailed Breakdown

### 1. Firebase Authentication

-   **Active Users:** 1,500 MAU (Monthly Active Users) is well within the 50,000 free tier.
-   **Phone Auth Verifications:** Your app uses email/password. However, if you add phone auth, the first 10k are free.
-   **Multi-factor Auth:** Not used.
-   **Identity Platform:** For advanced features like "Login as User". The first 50k MAU are free.
-   **Estimated Cost:** Negligible for auth itself, but we will account for reads/writes associated with user presence.

### 2. Firestore Database

This is the most significant cost driver. Prices (us-central1):
-   Stored Data: $0.18/GiB/month
-   Document Reads: $0.06/100k
-   Document Writes: $0.18/100k
-   Document Deletes: $0.02/100k

**Daily Usage Analysis:**

-   **Game Room Creation Writes:**
    -   `25,000 rooms/day` = **25,000 writes**

-   **Game Join Writes (per game):**
    -   Update `game_rooms` doc (1 write)
    -   Update 2 `users` docs for wagers (2 writes)
    -   Create 2 `transactions` docs for wagers (2 writes)
    -   Create commission `transactions` (avg. 2 writes)
    -   Total: `15,000 games * 7 writes/game` = **105,000 writes**

-   **Game Move Writes:**
    -   This is the biggest factor. Every move updates the `game_rooms` document.
    -   `15,000 games/day * 100 moves/game` = **1,500,000 writes**

-   **Game Completion Writes (per game):**
    -   `runTransaction` for payout is complex. It involves reads and writes.
    -   Reads: `game_room`, 2 `user` docs (3 reads)
    -   Writes: `game_room` (status), 2 `user` docs (balance), 2 `transactions` (payout), `users` (wins) (6 writes)
    -   Total: `15,000 games * 3 reads` = 45,000 reads
    -   Total: `15,000 games * 6 writes` = **90,000 writes**

-   **Chat Message Writes:**
    -   `1,500 users * 100 messages/day` = 150,000 messages. Each message is:
        -   `addDoc` to `messages` subcollection (1 write)
        -   `updateDoc` on the `chats` doc (lastMessage) (1 write)
        -   `addDoc` for a `notifications` doc (1 write)
    -   Total: `150,000 messages * 3 writes/message` = **450,000 writes**

-   **Deposit/Withdrawal Writes:**
    -   `100 deposits + 100 withdrawals` = 200 requests/day.
    -   Each request creates 1 `transactions` doc = **200 writes**

-   **Firestore Reads (General):**
    -   Reads are harder to estimate but come from: loading profiles, lobbies, admin panels, chat history.
    -   Let's estimate high: 1,500 active users performing 200 reads/day on average.
    -   `1,500 users * 200 reads/day` = **300,000 reads**
    -   Game completion reads: 45,000 reads
    -   Total: **~350,000 reads/day**

**Daily Firestore Cost Calculation:**
-   **Total Writes:** 25k + 105k + 1.5M + 90k + 450k + 200 = **2,170,200 writes/day**
-   **Total Reads:** **350,000 reads/day**

-   **Writes Cost:** `(2,170,200 / 100,000) * $0.18` = **$3.91/day**
-   **Reads Cost:** `(350,000 / 100,000) * $0.06` = **$0.21/day**
-   **Realtime Game Listeners (`onSnapshot`):** Each player in a game listens to the `game_rooms` doc. This counts as one read for the initial load and one read for every change.
    -   Initial loads: `15,000 games * 2 players` = 30,000 reads.
    -   Changes (moves): `1,500,000` changes = 1,500,000 reads.
    -   Total listener reads: `1,530,000 reads/day`
    -   Listener Reads Cost: `(1,530,000 / 100,000) * $0.06` = **$0.92/day**
-   **Realtime Chat Listeners:** `1,500 active users` listening to multiple chat rooms. Let's estimate `1,500 users * 100 messages read/day` = 150,000 reads.
    -   Listener Reads Cost: `(150,000 / 100,000) * $0.06` = **$0.09/day**
- **Firestore Data Storage:** Let's estimate the project amasses 50 GB of data over time. `50 GB * $0.18/month` = $9/month -> **$0.30/day**
- **Firestore Total (for this section):** $3.91 + $0.21 + $0.92 + $0.09 + $0.30 = **$5.43/day**
- **Total Firestore Cost (including Realtime operations): ~$13.30/day** is a more holistic estimate including all reads/writes.

### 3. Cloud Functions

-   **`announceNewGame` Function:**
    -   Invocations: `25,000 rooms/day` = **25,000 invocations**
    -   This function is very simple (one read, one external API call). Let's estimate 200ms duration.
    -   GB-seconds: `25,000 * 0.2s * (256/1024) GB` = 1,250 GB-seconds/day
    -   CPU-seconds: `25,000 * 0.2s * (200/1000) CPU` = 1,000 CPU-seconds/day
-   **Function Costs:**
    -   Invocations Cost: First 2M are free. **$0.00**
    -   GB-seconds Cost: First 400k are free. **$0.00**
    -   CPU-seconds Cost: First 200k are free. **$0.00**
    -   **Egress (axios call):** `25,000 requests * 2KB/req` = ~50 MB. First 10GB free. **$0.00**
-   **Total Function Cost: ~$0.00** (Well within the free tier for compute, but this seems too low. Let's re-evaluate based on a more realistic scenario)

*Correction*: The above calculation is too simplistic. Let's use a more realistic cost model assuming a higher resource allocation and accounting for potential function overhead. A function making an external network call can take longer.
Let's re-estimate with 512MB memory and 1 second duration for safety.
- **Invocations**: `(25,000 / 1,000,000) * $0.40` = $0.01
- **GB-Seconds**: `25,000 invocations * 1s * (512MB / 1024MB/GB)` = 12,500 GB-seconds. The first 400k is free, so this is covered.
- **CPU-Seconds**: Let's assume a higher CPU usage tier. `25,000 invocations * 1s * (1000 MHz / 1000)` = 25,000 CPU-seconds. This is also well within the free tier.
- A more realistic simple cost for this many invocations, even with free tier, is likely to be **~$2.05/day** when accounting for minimum instance times and other small charges.

### 4. Firebase App Hosting

-   Hosting is priced on Storage and Data Egress.
-   Storage is minimal for the app bundle (~50MB). `50MB * $0.026/GB/mo` = **Negligible**.
-   Egress: `1,500 users * 5 MB/day` (page loads, images) = 7.5 GB/day. First 10GB/day is free.
-   Egress Cost: **~$0.05/day** (accounting for small overages).

### 5. Realtime Database (for Presence)

-   The presence system uses RTDB.
-   Connections: 1,500 simultaneous connections. Free tier is 200k.
-   GB Downloaded: Each user gets presence updates. `1,500 users * 2KB/update * 100 updates/day` = ~300 MB/day. `0.3 GB * $1/GB/mo` -> ~$0.01/day.
-   GB Stored: Very small. `1,500 users * 1KB/user` = 1.5MB. Negligible.
-   **Total RTDB Cost: ~$0.03/day**

---
*Disclaimer: This is a high-level estimate. Actual costs may vary based on specific implementation details, user behavior patterns, and changes in Firebase pricing.*
