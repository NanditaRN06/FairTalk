# FairTalk API Documentation

## Base Configuration
- **Base URL (REST):** `http://localhost:5000` (or configured via environment)
- **Base URL (WebSocket):** `ws://localhost:5000`

---

## REST Endpoints

### User & Eligibility

#### 1. Check User Eligibility
Checks if a device is allowed to enter the matching queue based on daily limits and cooldowns.
- **Endpoint:** `GET /api/user/eligibility/:deviceId`
- **Response:**
  ```json
  {
    "eligible": true
  }
  ```
  *OR*
  ```json
  {
    "eligible": false,
    "reason": "LIMIT_REACHED", // or "COOLDOWN"
    "message": "Daily limit reached..."
  }
  ```

#### 2. Check Nickname Availability
Verifies if a nickname is currently in use within the active waiting queue.
- **Endpoint:** `GET /api/user/check-nickname?nickname=CurrentName`
- **Response:**
  ```json
  {
    "taken": false // true if collision found
  }
  ```

### Verification

#### 3. Biometric Verification
Verifies user liveness and detects gender using AI.
- **Endpoint:** `POST /api/verify`
- **Body:**
  ```json
  {
    "image": "base64_string_without_header..."
  }
  ```
- **Response:**
  ```json
  {
    "authorized": true,
    "gender": "male", // or "female"
    "confidence": 0.99,
    "message": "Verification successful"
  }
  ```
- **Note:** Requires an `image` buffer/blob. Sent improperly formatted base64 may result in server errors.

---

## WebSocket API

### Namespace: Queue (`/ws/queue`)
Used for users waiting to be matched.

#### **Client -> Server Events**

**Join Queue**
```json
{
  "type": "join_queue",
  "payload": {
    "userId": "user-uuid",
    "deviceId": "device-uuid",
    "nickname": "SkyWalker",
    "gender": "male",
    "genderPreference": "female", // or "any"
    "bio": "I love hiking and tech",
    "personalityAnswers": { "q1": 1, "q2": 3, ... }
  }
}
```

**Update Criteria** (e.g., agreeing to relax search parameters)
```json
{
  "type": "update_criteria",
  "payload": {
    "allowRelaxation": true
  }
}
```

#### **Server -> Client Events**

**Queued Confirmation**
```json
{ "status": "queued" }
```

**Match Found**
```json
{
  "status": "matched",
  "match": {
    "matchId": "uuid-match-id",
    "userB": { "nickname": "PartnerName", "gender": "female" },
    "reason": "Strong Personality Alignment"
  }
}
```

---

### Namespace: Chat (`/ws/chat`)
Used for active conversations.
**Query Params:** `?matchId=...&userId=...&deviceId=...`

#### **Client -> Server Events**

**Send Message**
```json
{
  "action": "message",
  "text": "Hello world!"
}
```

**Leave Chat**
```json
{
  "action": "leave"
}
```

#### **Server -> Client Events**

**Incoming Message**
```json
{
  "type": "message",
  "from": "partner",
  "text": "Hello there!"
}
```

**System Notification**
```json
{
  "type": "system",
  "event": "partner_left"
}
```
