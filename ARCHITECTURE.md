# FairTalk System Architecture

## 1. System Overview
FairTalk is a privacy-focused, real-time matching and chat platform. It uses a three-tier architecture split into **User**, **Match**, and **Chat** modules, emphasizing ephemeral data usage and fairness algorithms.

---

## 2. Module 1: User Module 👤
The User Module handles identity, verification, and eligibility without requiring traditional account signup (email/password).

### 2.1 Identity System (Device ID)
To maintain privacy while enabling rate limiting and safety, FairTalk uses a **Device ID** system.
-   **Generation:** On first visit, the frontend generates a UUID (v4) using the browser's Crypto API.
-   **Storage:** Stored persistently in the browser's `localStorage` (Key: `chat_device_id`).
-   **Usage:**
    -   Acts as the primary key for the user in the database.
    -   Used to track daily limits (Max 5 matches/day).
    -   Used to persist bans or blockades.

### 2.2 AI Verification & Privacy
Users must verify they are real humans before chatting.
-   **Process:** User takes a live selfie.
-   **Analysis:** Image is sent to backend -> Luxand Cloud API.
-   **Attribute Detection:** API checks for "Liveness", "Human Face", and "Gender".
-   **Privacy Policy (Delete-after-Verify):**
    -   The backend processes the image **in-memory only**.
    -   Once the API returns the confidence score and gender, the image buffer is discarded.
    -   **Images are NEVER saved to the database or file system.**

---

## 3. Module 2: Match Module 🤝
The core engine that pairs users based on compatibility.

### 3.1 Queue System (Redis)
-   **Data Structure:** Redis Sorted Set (`waiting_queue`).
-   **Ranking:** Users are sorted by timestamp (Score = Unix Timestamp), implementing a "First-In-First-Considered" fairness baseline.
-   **Payload:** Each entry contains `nickname`, `bio`, `gender`, `interests`, and `personality_answers`.

### 3.2 Matching Algorithm
A background worker (`matchingService.js`) polls the queue every 1 second.
**Formula:**
> `Score = (Shared_Answers × 2.0) + (Bio_Keywords × 1.5) + (Wait_Time × 0.05)`

**Logic:**
1.  **Filtering:** Exclude blocked users, active sessions, and gender preference mismatches.
2.  **Scoring:** Compare every user against the top N users in the queue.
3.  **Thresholding:**
    -   Pairs must meet a dynamic threshold (e.g., > 6.0 during high traffic, > 0.5 during low traffic).
    -   **Relaxed Mode:** Users waiting > 60s can opt-in to reduce the threshold by 60%.

---

## 4. Module 3: Chat Module 💬
Handles real-time communication once a match is made.

### 4.1 Signaling (WebSockets)
-   **Server:** Node.js `ws` library.
-   **Namespace:** `/ws/chat?matchId=...`
-   **Flow:**
    -   Frontend connects using the `matchId` provided by the Match Module.
    -   Server validates the `matchId` against the Redis `active_sessions` cache.
    -   Messages are relayed instantly between the two connected sockets.

### 4.2 Lifecycle & Safety
-   **Ephemeral:** Chat history is **not stored** long-term. Messages exist only in transit.
-   **Reporting:**
    -   Users can report abusive partners.
    -   Reports are logged to MongoDB for admin review (only metadata: "User A reported User B for reason X").
    -   A reported user may be automatically blocked if reports accumulate.

---

## 5. Critical Design Decisions

### 5.1 Privacy: Delete-After-Verify Logic
FairTalk was designed to minimize data liability.
-   **The Mechanism:** When the `/api/verify` endpoint receives a base64 image:
    1.  It is converted to a Buffer.
    2.  Sent to Luxand AI.
    3.  The response (Gender: Male/Female, Confidence: 0.99) is extracted.
    4.  **Crucially:** The function exits, and the image buffer is garbage collected. No `fs.write` or database save ever occurs for the image data.

### 5.2 Identity: Device ID Implementation
To strictly enforce "One Person, Five Matches per Day" without login walls:
-   **Client-Side:** `frontend/src/utils/identity.js` ensures a globally unique ID is generated once and persists across reloads.
-   **Server-Side:** usage of `mongoose` with `upsert: true` on the `deviceId` key ensures we track metadata (daily count, last match time) without needing personal info like email or phone numbers.

---

## 6. Architecture Hierarchy Diagram

```text
+-----------------------------------------------------------------------------+
|                                CLIENT LAYER                                 |
+-----------------------------------------------------------------------------+
|                                                                             |
|   Browser 1 (User A)                       Browser 2 (User B)               |
|  +------------------------------+         +------------------------------+  |
|  | React App (Vite)             |         | React App (Vite)             |  |
|  | - ChatPage.jsx               |         | - ChatPage.jsx               |  |
|  | - identity.js (DeviceID)     |         | - identity.js (DeviceID)     |  |
|  | - CameraVerification.jsx     |         | - CameraVerification.jsx     |  |
|  +------------------------------+         +------------------------------+  |
|         |                                        |                          |
|   Device ID: uuid-1234                     Device ID: uuid-5678             |
|   Status: Verified (Male)                  Status: Verified (Female)        |
+---------+----------------------------------------+--------------------------+
          |                                        |
          | WS Connect ( /ws/chat?matchId=... )    |
          v                                        v
+-----------------------------------------------------------------------------+
|                                SERVER LAYER                                 |
+-----------------------------------------------------------------------------+
|                                                                             |
|   Express.js Server (Port 5000)                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |   server.js (WebSocket Handler)                                       |  |
|  |   - Manages Connections map[MatchID] -> [SocketA, SocketB]            |  |
|  |   - Handles "message", "leave", "report" events                       |  |
|  |                                                                       |  |
|  +-----------------------------------+-----------------------------------+  |
|                                      |                                      |
|                                      v                                      |
|  +-----------------------------------+-----------------------------------+  |
|  |   matchingService.js (Background Worker)                              |  |
|  |   - Polls Redis Queue every 1s                                        |  |
|  |   - Calculates Score: (Answers*2) + (Bio*1.5) + (WaitTime*0.05)       |  |
|  |   - Publish "match_found" -> WS                                       |  |
|  +-----------------------------------+-----------------------------------+  |
|                                      |                                      |
|                                      v                                      |
|  +-----------------------------------+-----------------------------------+  |
|  |   verificationController.js                                           |  |
|  |   - POST /api/verify -> Standard Luxand API Integration               |  |
|  |   - Returns: { gender: "male", confidence: 0.99 }                     |  |
|  |   - *Images are processed in RAM and discarded immediately*           |  |
|  +-----------------------------------+-----------------------------------+  |
|                                                                             |
+--------------------------------------+--------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                                 DATA LAYER                                  |
+-----------------------------------------------------------------------------+
|                                                                             |
|   Redis (Upstash)                        MongoDB (Atlas)                    |
|  +--------------------------+           +--------------------------+        |
|  | - waiting_queue (ZSET)   |           | - users (Collection)     |        |
|  | - active_sessions (SET)  |           |   - deviceId (Index)     |        |
|  | - device_match (HASH)    |           |   - dailyMatches         |        |
|  +--------------------------+           |   - blockedStatus        |        |
|                                         +--------------------------+        |
+-----------------------------------------------------------------------------+
```

### 6.1 Matching Flow (Simplified)
```text
   USER (You)                       FAIRTALK SERVER
      |                                   |
      |   1. "I want to chat!"            |
      |   (Sends Profile & Answers)       |
      | --------------------------------> |
      |                                   |
      |                                   |  2. AUTOMATIC SEARCH
      |          (Waiting...)             |     - Looks at everyone waiting
      |                                   |     - Compares answer similarity
      |                                   |     - Checks wait-time priority
      |                                   |
      |                                   |  3. BEST MATCH FOUND
      |                                   |     - Example: "SkyWalker"
      |                                   |     - Score: 95% Compatibility
      |                                   |
      |   4. "Connecting you..."          |
      | <-------------------------------- |
      v                                   v
   Enters Chat Room                Removes Both from Queue
```

### 6.2 Chat Flow (Simplified)
```text
    YOU                           SERVER                       PARTNER
     |                              |                             |
     |   1. Type: "Hello!"          |                             |
     +----------------------------> |                             |
     |                              |                             |
     |                              |  2. Instant Relay           |
     |                              |     (No saving to DB)       |
     |                              |                             |
     |                              |  3. Delivers "Hello!"       |
     |                              +---------------------------> |
     |                              |                             |
     |                              |    4. Types: "Hi there"     |
     |                              | <-------------------------- +
     |   5. Delivers "Hi there"     |                             |
     | <--------------------------- +                             |
     v                              v                             v
```
