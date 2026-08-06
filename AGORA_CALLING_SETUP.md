# Agora calling frontend contract

All endpoints require `Authorization: Bearer <access-token>`.

## Call lifecycle

1. Caller creates the call:

```http
POST /api/v1/call-history
Content-Type: application/json

{"receiverId":"USER_ID","type":"video_call"}
```

Use `audio_call` for audio-only calls. The receiver gets the Socket.IO event
`call:incoming`.

2. Receiver accepts or rejects:

```http
PATCH /api/v1/call-history/CALL_ID/accept
PATCH /api/v1/call-history/CALL_ID/reject
```

The caller gets `call:accepted` or `call:rejected`.

3. After acceptance, both participants request their own Agora token:

```http
GET /api/v1/agora/token/CALL_ID
```

Pass the returned `appId`, `token`, `channelName`, and numeric `uid` unchanged
to the Agora SDK. Both participants receive the same channel and different UIDs.

4. Caller may cancel a ringing call; either participant may end an accepted call:

```http
PATCH /api/v1/call-history/CALL_ID/cancel
PATCH /api/v1/call-history/CALL_ID/end
```

Socket.IO lifecycle events are `call:incoming`, `call:accepted`,
`call:rejected`, `call:cancelled`, and `call:ended`.

Before deployment, set `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`, then apply
the Prisma schema to the intended database and restart the API.
