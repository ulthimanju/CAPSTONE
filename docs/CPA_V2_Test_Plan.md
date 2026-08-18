# CPA-V2 — Exhaustive Test Plan
**Project:** AI-Powered Study Assistant (Capstone)
**Specialization:** CSE | Year 5 | Semester 9
**Date:** 2026-08-18
**Source:** Full audit of all 7 microservices + shared layer

---

## Existing Test Baseline (44 files)

| Service | Existing Tests |
|---|---|
| identity-service | refresh token rotation, concurrency, hashing, index, atomicity, user cache |
| workspace-service | soft delete, cache, member locking, collaborators, member uniqueness |
| document-service | upload size, MIME, idempotency, failure cleanup, state machine, cascade delete, outbox, job retry, streaming, cache, partial index, locking |
| rag-service | cache, top_k validation, vector metadata index |
| ai-service | endpoints, token counter, prompt builders, passage selection |
| api-gateway | health, routing, aggregation |
| notification-service | cascade delete, idempotency, history locking, event retention |

> All 44 existing tests target unit-level logic. **Zero E2E, OAuth, cross-service, security, performance, or UI tests exist.**

---

## Category 1 — Unit Tests (Gaps Only)

### 1.1 Identity Service
| Test | Why It Matters | Priority |
|---|---|---|
| Register with valid email + strong password → user created | Core path | P1 |
| Register duplicate email → 409 Conflict | Prevents duplicate accounts | P1 |
| Register with weak password (< 8 chars) → 422 validation | Input safety | P1 |
| Register with malformed email → 422 | Input safety | P1 |
| Login with correct credentials → JWT + refresh cookie returned | Core path | P1 |
| Login with wrong password → 401 | Auth correctness | P1 |
| Login with non-existent email → 401 (not 404, avoid user enumeration) | Security | P1 |
| Logout revokes current session | Core path | P1 |
| Logout-all vs logout are both revoking ALL sessions (known bug, document behavior) | Behavioral consistency | P2 |
| `DELETE /sessions/{session_id}` with session belonging to another user → should 403 (currently does not — document gap) | Security gap | P1 |
| Refresh token: new token NOT re-set as cookie (only in body after first login) | Client contract clarity | P2 |
| Session delete does NOT revoke associated refresh token → token reusable until expiry | Security gap | P1 |

### 1.2 Workspace Service
| Test | Why It Matters | Priority |
|---|---|---|
| Create workspace valid → 201 | Core path | P1 |
| Create workspace empty name → 422 | Input validation | P1 |
| Create workspace name > 255 chars → 422 | Boundary | P2 |
| Only owner can delete workspace → non-owner gets 403 | Authorization | P1 |
| Workspace deletion publishes `cpa.workspace.deleted` event | Event contract | P1 |
| Workspace deletion with RabbitMQ down → workspace deleted but event lost (document behavior) | Failure mode | P1 |
| Notification publish failure silently swallowed → workspace still deleted | Resilience | P2 |

### 1.3 AI Service
| Test | Why It Matters | Priority |
|---|---|---|
| `GetEmbeddings` gRPC → returns 3072-dim vectors | Contract | P1 |
| `GenerateText` gRPC → returns non-empty text | Contract | P1 |
| Gemini 429 quota → fallback to next model | Resilience | P1 |
| All Gemini models exhausted → raises error | Failure mode | P1 |
| gRPC `GetEmbeddings` HTTP fallback on gRPC failure | Fallback correctness | P2 |

### 1.4 RAG Service
| Test | Why It Matters | Priority |
|---|---|---|
| Guardrail rejects question with max similarity < 0.35 | Business logic | P1 |
| Guardrail passes question with max similarity ≥ 0.35 | Business logic | P1 |
| Context builder truncates at 16,000 chars (4000 tokens × 4) | Prompt safety | P2 |
| `get_retrieved_chunks` cache hit bypasses embedding call | Performance correctness | P2 |
| `set_retrieved_chunks` with empty list → stored as empty | Edge case | P2 |
| gRPC channel stale after ai-service restart → falls back to HTTP | Resilience | P2 |

---

## Category 2 — OAuth Flow Tests ← NEW

> Tests for the complete Google OAuth 2.0 login flow including all failure and interruption scenarios.

### 2.1 Normal OAuth Flow
| Test | Expected | Priority |
|---|---|---|
| `GET /api/v1/oauth/google/login` → returns 302 redirect to Google's OAuth URL | 302 with `Location: accounts.google.com/...` | P1 |
| Redirect URL contains required scopes: `openid email profile` | Scope verification | P1 |
| Redirect URL contains `access_type=offline` (for refresh token) | Contract | P1 |
| Redirect URL contains `prompt=consent select_account` | Forces account picker every time | P2 |
| `GET /api/v1/oauth/google/callback?code=valid_code` → 302 to `frontend/auth/callback?token=...` | Core success path | P1 |
| Callback sets `refresh_token` as **httponly** cookie | Security | P1 |
| Cookie `samesite=lax` is set | CSRF protection | P2 |
| Cookie `secure=False` in development (verify value matches env) | Config awareness | P2 |
| First OAuth login → new user created with `role=STUDENT` | User creation | P1 |
| Second OAuth login with same Google account → existing user returned (no duplicate) | Idempotency | P1 |

### 2.2 User Cancels OAuth Mid-Flow ← CRITICAL NEW
| Test | Scenario | Expected | Priority |
|---|---|---|---|
| User clicks "Cancel" on Google consent screen | Callback receives `error=access_denied`, no `code` param | 422/400 with meaningful error, NOT a 500 crash | P1 |
| User closes browser tab mid-redirect | No callback received | Timeout on next attempt; new login starts fresh | P1 |
| User presses browser Back on Google consent page | No `code` param in callback | Same as cancel — 422, not 500 | P1 |
| User denies specific scopes on consent screen | Callback may receive partial code or `error=access_denied` | Handled gracefully, user informed | P1 |
| User cancels and immediately clicks login again | Two parallel OAuth flows | Second flow completes independently; no state collision | P1 |
| User completes OAuth, then opens the same callback URL again (code reuse) | Google returns `invalid_grant` on token exchange | 422 "OAuth token authorization failed", not 500 | P1 |
| State parameter in callback is forged/tampered | *(Currently state is NOT validated — document gap)* | Currently passes through (security gap — P1 to document) | P1 |

### 2.3 OAuth Network Failure Scenarios
| Test | Scenario | Expected | Priority |
|---|---|---|---|
| Google token endpoint is unreachable (timeout) | `httpx.TimeoutException` from `/token` POST | Should return 503/500 with clear message (currently unhandled → raw 500) | P1 |
| Google userinfo endpoint returns malformed JSON | id_token decode fails AND userinfo parse fails | `GoogleOAuthError` raised → 422 | P2 |
| `code` param present but already expired (> 10 min old) | Google returns `invalid_grant` | 422 "OAuth token authorization failed" | P1 |
| `code` param present but used with wrong `redirect_uri` | Google returns error | 422 | P2 |
| Google returns `access_token` but no `id_token` AND `/userinfo` returns no email | Rare edge case | 422 "Failed to retrieve user profile info from Google" | P2 |

### 2.4 Token & Session Lifecycle After OAuth
| Test | Expected | Priority |
|---|---|---|
| After OAuth login: `POST /tokens/refresh` with cookie → new access_token returned | P1 |
| After first token refresh: new `refresh_token` returned in **body** (NOT re-set in cookie) | Behavioral contract | P1 |
| Client uses old refresh token after rotation → 401 "Invalid or revoked refresh token" | Security | P1 |
| Refresh token used twice concurrently (race condition) → only one succeeds, other gets 401 | ✅ Already tested | P1 |
| Refresh token after 30-day expiry → 401 "Refresh token has expired" | Expiry | P1 |
| `POST /sessions/logout` → ALL sessions revoked (not just current) | Behavioral (known design) | P1 |
| After logout, old access token still valid until JWT expiry | Stateless JWT limitation | P2 |
| After session delete, refresh token associated with that session still works until expiry | Security gap to document | P1 |

---

## Category 3 — Cross-Service Communication Tests ← NEW

> Tests for every RabbitMQ event, gRPC call, HTTP internal call, and SSE channel between services.

### 3.1 RabbitMQ: Workspace Deleted → Document Cascade
| Test | Expected | Priority |
|---|---|---|
| Delete workspace → `cpa.workspace.deleted` event published to `cpa.events` exchange | Event present in queue | P1 |
| Document-service consumer receives event → all workspace documents hard-deleted | DB verification | P1 |
| Consumer receives event with valid workspace_id → Redis cache `workspace_documents:{ws_id}` deleted | Cache cleared | P1 |
| Consumer receives duplicate event (same event_id) → idempotency check skips re-processing | Redis idempotency | P1 |
| Consumer receives event with missing `workspace_id` field → ACKed and logged (not DLQ'd) | Silent drop behavior | P2 |
| Consumer receives event with invalid UUID `workspace_id` → logged, not DLQ'd | Silent drop | P2 |
| RabbitMQ is down when workspace deleted → workspace DB row deleted but documents NOT deleted (orphan) | Known failure mode to document | P1 |
| RabbitMQ recovers after downtime → queued event replayed and documents deleted | Durability | P1 |
| Consumer crashes mid-processing → message rejected to `cpa.dlq` | DLQ routing | P2 |

### 3.2 RabbitMQ: Chunk Generated → RAG Indexed
| Test | Expected | Priority |
|---|---|---|
| Chunking completes → `cpa.rag.ingest` event published | Event in queue | P1 |
| RAG ingest consumer receives event → embeddings created in `rag_db.chunk_embeddings` | DB verification | P1 |
| Ingest event with duplicate event_id → Redis idempotency skips re-embedding | Redis check | P1 |
| Ingest event missing `chunks` field → ACKed and logged (lost, not DLQ'd) | Silent drop | P2 |
| Ingest event missing `document_id` → same | Silent drop | P2 |
| RabbitMQ publish fails AND HTTP fallback to `rag-service/embeddings/generate` fails → document marked READY_FOR_RAG but never indexed | Known gap to document | P1 |
| HTTP fallback triggered when RabbitMQ returns `False` → `POST /api/v1/rag/embeddings/generate` called | Fallback verification | P1 |
| RAG ingest consumer crashes → message goes to `cpa.dlq` | DLQ | P2 |

### 3.3 RabbitMQ: Notifications
| Test | Expected | Priority |
|---|---|---|
| Workspace deleted → `cpa.notifications.workspace` event published | Notification in queue | P1 |
| RAG indexing completed → `cpa.notifications.document` event published | Notification in queue | P1 |
| Notification consumer receives event → persisted in MongoDB | MongoDB record | P1 |
| Notification consumer receives duplicate event → idempotency skips duplicate | Redis idempotency | P1 |
| `POST /api/v1/notifications/events` (unauthenticated) → notification injected | Security gap — document that this endpoint has no auth | P1 |

### 3.4 gRPC: workspace-service → identity-service
| Test | Expected | Priority |
|---|---|---|
| Invite member with valid email → gRPC `GetUserByEmail` called, user returned | gRPC call succeeds | P1 |
| Invite member, identity-service gRPC down → HTTP fallback to `GET /api/v1/users/lookup/email` | Fallback triggered | P1 |
| Invite member, user email not found → 404 blocks invitation | Correct behavior | P1 |
| Invite member, gRPC down AND HTTP fallback returns non-200 → invitation created with unresolved `user_id=None` | Known gap — document | P2 |
| gRPC channel timeout (3.0s) exceeded → falls back to HTTP | Timeout behavior | P2 |
| identity-service restarts → gRPC channel stale but HTTP fallback handles it | Resilience | P2 |

### 3.5 gRPC: rag-service → ai-service
| Test | Expected | Priority |
|---|---|---|
| `GetEmbeddings` via gRPC → returns vectors in < 30s | Core path | P1 |
| ai-service gRPC down → HTTP fallback `POST /api/v1/ai/embeddings` called | Fallback triggered | P1 |
| `GenerateText` gRPC fast-fails at 8s → HTTP fallback with 120s timeout | Timeout behavior | P1 |
| ai-service HTTP also down → RAG ingest message goes to DLQ | DLQ routing | P2 |
| gRPC max message size exceeded (> 25MB embeddings payload) | Error caught gracefully | P2 |
| ai-service restarts mid-batch-embedding → gRPC exception → HTTP fallback | Resilience | P2 |

### 3.6 HTTP Internal: generate_chunks → workspace-service (Topics Update)
| Test | Expected | Priority |
|---|---|---|
| Chunking completes → `PUT /api/v1/workspaces/{ws_id}/topics` called with chunk headings | Internal call made | P2 |
| workspace-service returns 4xx/5xx → silently swallowed, chunking still succeeds | Resilience | P2 |
| Internal JWT used has `role=ADMIN` and expires in 60 min | Security contract | P2 |

### 3.7 SSE (Server-Sent Events): Two Independent Pipelines
| Test | Expected | Priority |
|---|---|---|
| RAG indexing completes → Redis `workspace_events:{ws_id}` receives `VectorIndexing COMPLETED` | Redis channel | P1 |
| Browser subscribed to `GET /api/v1/workspaces/{ws_id}/events` → receives SSE event in < 5s after indexing | End-to-end SSE | P1 |
| Browser subscribed to `GET /api/v1/notifications/stream` → receives notification event via in-process asyncio queue | Second SSE path | P1 |
| Both SSE paths receive event for same action (indexing complete) | Verify both deliver | P2 |
| Redis pub/sub down → gateway SSE stream stalls (no events delivered) | Failure mode | P2 |
| SSE connection dropped by browser → reconnect continues from last event | Browser reconnect | P2 |

### 3.8 API Gateway Proxy Behavior
| Test | Expected | Priority |
|---|---|---|
| Request to `/api/v1/workspaces/...` → proxied to workspace-service | Correct routing | P1 |
| Request to `/api/v1/workspaces/{id}/learning-path` (POST) → proxied to **ai-service** (not workspace-service) | Special route | P1 |
| `GET /api/v1/dashboard` → parallel fetch from workspace + notification services | Aggregation | P1 |
| `GET /api/v1/workspaces/{id}/overview` → parallel fetch from workspace + document services | Aggregation | P1 |
| Upstream service returns 500 → gateway forwards 500 as-is (no retry) | No retry behavior | P2 |
| Request > 180s → gateway timeout (RequestTimeoutMiddleware) fires | Timeout | P2 |
| `GET /api/v1/rag/chat` → gateway uses 180s read timeout (not default 60s) | Path-based timeout | P1 |
| GZip compression applied to responses > 1024 bytes | Middleware | P3 |
| `X-Request-ID` header propagated to all upstream services | Correlation | P2 |

---

## Category 4 — API / End-to-End Tests

### 4.1 Authentication
| Test | Expected | Priority |
|---|---|---|
| `POST /api/v1/auth/register` valid → 201 | P1 |
| `POST /api/v1/auth/login` valid → 200 + JWT + refresh cookie | P1 |
| `POST /api/v1/auth/login` wrong password → 401 | P1 |
| `GET /api/v1/profile` without token → 401 | P1 |
| `GET /api/v1/profile` with expired JWT → 401 | P1 |
| `POST /api/v1/tokens/refresh` with valid cookie → 200 + new tokens | P1 |
| `POST /api/v1/sessions/logout` → 204, all sessions revoked | P1 |
| `DELETE /api/v1/sessions/{other_user_session_id}` → should 403 (currently does NOT — gap) | P1 |

### 4.2 Workspace
| Test | Expected | Priority |
|---|---|---|
| `POST /api/v1/workspaces` → 201 | P1 |
| `GET /api/v1/workspaces` → own workspaces only | P1 |
| `DELETE /api/v1/workspaces/{id}` by non-owner → 403 | P1 |
| `DELETE /api/v1/workspaces/{id}` by owner → 204 | P1 |
| `GET /api/v1/workspaces/{id}` after delete → 404 | P1 |
| `GET /api/v1/workspaces/{other_user_id}` → 403 | P1 |

### 4.3 Document Upload
| Test | Expected | Priority |
|---|---|---|
| Upload valid PDF → 201, status PROCESSING | P1 |
| Upload valid PPTX → 201 | P1 |
| Upload `.exe` → 415 Unsupported Media Type | P1 |
| Upload 0-byte file → 400 | P1 |
| Upload > 50MB → 413 | P1 |
| Upload same file twice → idempotency (no duplicate) | P2 |
| Document status progresses: PROCESSING → PARSING → CHUNKING → READY_FOR_RAG | P1 |
| Upload to workspace you don't own → 403 | P1 |
| `DELETE /api/v1/documents/{id}` → 204 | P1 |
| `GET /api/v1/documents/{id}` after delete → 404 | P1 |

### 4.4 RAG Chat
| Test | Expected | Priority |
|---|---|---|
| Valid question → 200 + answer + citations | P1 |
| Empty question → 422 | P1 |
| Unrelated question → 422 guardrail | P1 |
| Chat in workspace with no documents → 422 | P1 |
| Chat in another user's workspace → 403 | P1 |
| Same question twice → second served from Redis cache | P2 |
| `top_k=0` → 422 validation | P2 |
| `top_k=100` → 422 (> 20 max) | P2 |

### 4.5 Summary Generation
| Test | Expected | Priority |
|---|---|---|
| `POST` generate summary → 202 Accepted | P1 |
| `GET` summary after generation → 200 + structured content | P1 |
| Regenerate summary → new content replaces old | P2 |
| Summary for workspace with no documents → 404 or empty | P2 |

---

## Category 5 — Document Pipeline Tests

| Test | Expected | Priority |
|---|---|---|
| PDF upload → LlamaParse OCR → markdown in DB | Pipeline complete | P1 |
| PPTX upload → parsed slide content → chunks | Pipeline complete | P1 |
| Corrupted PDF → status FAILED, error message stored | Graceful failure | P1 |
| Password-protected PDF → FAILED with clear error | Graceful failure | P2 |
| 0-word document (only images) → FAILED or empty chunks | Graceful handling | P2 |
| 100-page PDF → parsed within 5 min timeout | Scale | P2 |
| Chunking produces ≥ 1 chunk per document | Minimum output | P1 |
| Chunk overlap preserved between consecutive chunks | Semantic integrity | P2 |
| Re-chunking same document → old chunks deleted, new ones created | Idempotency | P1 |
| LlamaParse API key invalid → FAILED with auth error | Config error | P1 |
| LlamaParse API down → retry mechanism or FAILED status | Resilience | P2 |

---

## Category 6 — Security Tests

### 6.1 Authentication & Authorization
| Test | Expected | Priority |
|---|---|---|
| JWT with invalid signature → 401 | P1 |
| JWT with tampered `user_id` payload → 401 | P1 |
| JWT expired → 401 | P1 |
| Access another user's workspace → 403 | P1 |
| Upload document to another user's workspace → 403 | P1 |
| RAG chat in another user's workspace → 403 | P1 |
| `DELETE /sessions/{session_id}` for another user's session → 403 (currently missing — gap) | P1 |

### 6.2 OAuth Security
| Test | Expected | Priority |
|---|---|---|
| Forged `state` parameter in OAuth callback | Currently accepted (no validation — document as CSRF gap) | P1 |
| Replay OAuth `code` (use same code twice) | Second use → 422 from Google `invalid_grant` | P1 |
| OAuth callback without `code` param → 422 (not 500) | P1 |
| `refresh_token` cookie set with `secure=False` (testable in HTTPS env) | Flag config gap | P2 |

### 6.3 Input Validation
| Test | Expected | Priority |
|---|---|---|
| SQL injection in workspace name: `'; DROP TABLE workspaces; --` | Safely escaped, no crash | P1 |
| XSS in chat question: `<script>alert(1)</script>` | Stored safely, rendered escaped | P1 |
| XSS in workspace name | Stored/displayed safely | P1 |
| Extremely long input (5000-char question) | Truncated or 422 | P2 |
| Null bytes in file name | Handled safely | P2 |

### 6.4 Notification Service Auth Gap
| Test | Expected | Priority |
|---|---|---|
| `POST /api/v1/notifications/events` with no JWT → notification injected | Document this gap — unauthenticated endpoint | P1 |
| External actor injects fake "workspace.deleted" notification | Received and stored — gap to document | P1 |

### 6.5 Data Sensitivity
| Test | Expected | Priority |
|---|---|---|
| Login response body does not contain password hash | No sensitive data leak | P1 |
| Google `access_token` stored in DB — verify it's not returned in any API response | Sensitive data audit | P2 |
| Refresh token hash (not raw) stored in DB | Hash verification | P1 |

---

## Category 7 — Performance, Load & Stress Tests

### 7.1 Load Testing (Expected / Normal Peak Traffic)
| Test | Target | Priority |
|---|---|---|
| 10 concurrent RAG chat queries → all 200 OK | 0 failures | P1 |
| RAG chat p95 response time | < 30s | P1 |
| Redis cache hit: same query twice → 2nd response < 1s | Cache speedup | P1 |
| 5 simultaneous document uploads | All processed, no race | P1 |
| API gateway under 100 req/sec steady load | No 5xx, latency < 200ms | P2 |
| RabbitMQ queue depth under normal load | Consumer keeps up (zero queue accumulation) | P3 |

### 7.2 Stress Testing (Pushing System to Breaking Point)
| Test | Stress Condition / Target | Priority |
|---|---|---|
| 50–100 concurrent RAG queries beyond LLM pool capacity | Fast HTTP 503 / 429 backpressure, no container crash | P1 |
| 20 concurrent large PDF uploads (10MB+ each) | CPU/RAM spike handled, memory leak free, no OOM kill | P1 |
| Database Connection Pool Exhaustion (exceeding `DATABASE_POOL_SIZE` + `MAX_OVERFLOW`) | Requests queue cleanly without dropping connections or crashing Uvicorn | P1 |
| RabbitMQ message flood (1,000 ingest events in queue) | Consumers process sequentially via `prefetch_count=10` without crashing | P2 |
| Redis memory saturation (fill Redis cache beyond maxmemory policy) | Eviction policy (`allkeys-lru`) triggers safely without service failure | P2 |
| Microservice Chaos/Crash Resilience (kill `ai-service` or `redis` during peak load) | Fallbacks trigger gracefully, system self-heals upon container restart | P1 |

### 7.3 Spike & Endurance/Soak Testing
| Test | Scenario / Target | Priority |
|---|---|---|
| Sudden traffic spike: 0 → 150 req/sec in 5 seconds | Gateway throttles/queues cleanly, recovers to normal latency | P2 |
| Soak/Endurance Test: 12-hour continuous steady traffic | Memory usage remains flat (0 memory leaks across FastAPI & Redis) | P2 |
| Long-running connection stress (500 idle SSE connections open simultaneously) | Gateway event loop remains responsive | P2 |

---

## Category 8 — UI / UX Tests (Frontend)

| Test | Expected | Priority |
|---|---|---|
| Login page renders at `/` | Page visible | P1 |
| Google OAuth button → redirects to Google | 302 redirect | P1 |
| After OAuth cancel and retry → login page works cleanly | No broken state | P1 |
| JWT auto-attached to all API requests | Auth header present | P1 |
| Expired JWT → silent refresh via refresh token → user not logged out | Transparent refresh | P1 |
| Workspace list renders after login | Correct data | P1 |
| Create workspace modal → validates empty name | Validation | P1 |
| Upload PDF via drag-and-drop | Accepted | P1 |
| Upload progress bar shown | UI feedback | P2 |
| Document status auto-updates without refresh (SSE) | Real-time | P1 |
| "Generate Summary" button spinner while loading | Loading state | P1 |
| Summary content renders markdown (headers, bold, lists) | Markdown render | P1 |
| RAG chat sends message on Enter key | UX | P1 |
| RAG answer renders markdown + code blocks | Render | P1 |
| Citations shown below each answer | Feature | P1 |
| Toast shown on wrong file type upload | Error feedback | P1 |
| Toast shown on RAG guardrail 422 | Error feedback | P1 |
| No toast on RAG success | No false error | P1 |
| Responsive at 375px (mobile) | Mobile layout | P2 |
| Responsive at 768px (tablet) | Tablet layout | P2 |
| Dark mode (if supported) | Theme | P3 |

---

## Category 9 — Edge Cases

### 9.1 User Behavior Edge Cases
| Scenario | Expected | Priority |
|---|---|---|
| User cancels OAuth and starts again immediately | Fresh flow, no stale state | P1 |
| User opens 2 browser tabs, chats from both simultaneously | No race condition, both get answers | P2 |
| User deletes workspace while document is being parsed | Document-service handles gracefully (cascade delete or FAILED status) | P1 |
| User uploads same document to same workspace twice | Idempotency — no duplicate | P1 |
| User asks RAG question while indexing is still in progress | 422 with indexing message or partial results | P1 |
| User generates summary with 1 document vs 10 documents | Both work, no timeout | P2 |
| User invites collaborator with unregistered email | 404 or informative error | P2 |
| User refreshes page during file upload | Upload continues or cleanly aborted | P2 |

### 9.2 System / Infrastructure Edge Cases
| Scenario | Expected | Priority |
|---|---|---|
| Redis goes down | App still works (cache miss falls through to DB) | P1 |
| RabbitMQ goes down | App still works; events queued on reconnect | P1 |
| PostgreSQL briefly unreachable | Retries, then 503 | P1 |
| ai-service restarts mid-request | gRPC exception → HTTP fallback | P1 |
| identity-service restarts → workspace invite → gRPC stale channel | Fallback to HTTP | P2 |
| rag_ingest_consumer loses connection to RabbitMQ | 5s retry loop, reconnects | P1 |
| Dead Letter Queue (`cpa.dlq`) receives message | Message inspectable, not lost | P2 |
| LlamaParse API quota exhausted | Document FAILED with quota error | P1 |
| Gemini API 429 quota exhausted for all models | RAG chat returns 503 or last-resort error | P1 |
| Workspace deletion event silently lost (RabbitMQ down) → documents orphaned | Known gap — document, then implement retry | P1 |

### 9.3 Data Edge Cases
| Scenario | Expected | Priority |
|---|---|---|
| Empty workspace (0 documents) → RAG chat | 422 with helpful message | P1 |
| Document uploaded but parsing failed → RAG chat | 422 "no indexed content" | P1 |
| Single-word question ("CAP") | Retrieved and answered | P2 |
| 5000-character question | Truncated or 422 | P2 |
| Question in Tamil or Hindi script | RAG searches, responds in language or English | P3 |
| Unicode/emoji in workspace name `📚 Study` | Stored and displayed correctly | P2 |
| Duplicate document name in same workspace | Separate document IDs, both accessible | P2 |
| 1000 chunks in a workspace | pgvector HNSW handles query in < 5s | P2 |
| Document with only whitespace content | 0 chunks, graceful handling | P2 |
| Chunk content > 4000 tokens | Context builder truncates safely | P2 |

---

## Category 10 — Known Gaps to Document (Not Fix Yet)

> These are real bugs/design gaps found in the audit. Test that the current behavior matches the documented behavior.

| Gap | Current Behavior | Risk | Priority |
|---|---|---|---|
| OAuth state parameter not validated on callback | Any `state` accepted — CSRF possible | High | P1 |
| `DELETE /sessions/{session_id}` no owner check | Any user can delete any session by ID | High | P1 |
| Session delete does not revoke refresh token | Token valid until expiry post-logout | Medium | P1 |
| `POST /notifications/events` unauthenticated | Any caller can inject notifications | Medium | P1 |
| `/sessions/logout` and `/sessions/logout-all` identical | Both revoke ALL sessions | Low | P2 |
| Workspace deletion RabbitMQ event in bare `except: pass` | Event lost if broker down → orphan documents | High | P1 |
| RAG ingest trigger failure in `except: pass` | Document READY_FOR_RAG but never indexed | High | P1 |
| `refresh_access_token()` on `GoogleOAuthClient` dead code | Never called — unused method | Low | P3 |
| New refresh token not re-set as cookie after `/tokens/refresh` | Client must manage body token | Medium | P2 |
| `invite_member` gRPC fallback HTTP non-200 → `user_id=None` | Invitation created without resolved user | Medium | P2 |
| Two independent SSE pipelines (Redis vs in-process asyncio) | Different schemas, may diverge | Low | P2 |
| Google `access_token` stored plaintext in `oauth_identities` table | Data sensitivity | Medium | P2 |

---

## Priority Execution Order

### 🔴 Do First — P1 (App-correctness and security)
1. OAuth E2E: cancel, retry, code reuse, token lifecycle
2. Cross-service: workspace delete cascade, RAG ingest pipeline
3. gRPC: rag→ai embeddings, workspace→identity invite
4. Security: JWT tamper, cross-user 403, state CSRF gap, session delete gap
5. API E2E: auth, workspace, document upload, RAG chat

### 🟡 Do Second — P2 (Quality and resilience)
1. RabbitMQ failure modes (broker down scenarios)
2. SSE end-to-end delivery
3. Performance: concurrent RAG, cache speedup measurement
4. UI tests: all main screens, SSE real-time updates
5. Edge cases: Redis down, empty workspace, mid-upload delete

### 🟢 Do Later — P3 (Nice to have)
1. Load test: 50+ concurrent users
2. Multilingual queries
3. 1000-document workspace scale
4. GZip middleware verification
5. Dead code audit (`refresh_access_token`)

---

## Test Counts Summary

| Category | Tests Planned | Existing | Missing |
|---|---|---|---|
| Unit Tests | 55 | 44 ✅ | 11 ❌ |
| OAuth Flow | 32 | 0 | 32 ❌ |
| Cross-Service (RabbitMQ + gRPC + SSE + HTTP) | 45 | 0 | 45 ❌ |
| API / E2E | 35 | 0 | 35 ❌ |
| Document Pipeline | 11 | 0 | 11 ❌ |
| Security | 18 | 0 | 18 ❌ |
| Performance / Load | 9 | 1 (manual RAG) | 8 ❌ |
| UI / UX | 20 | 0 | 20 ❌ |
| Edge Cases | 26 | 0 | 26 ❌ |
| Known Gaps (Document) | 12 | 0 | 12 ❌ |
| Workspace Collaboration & Invitations | 28 | 0 | 28 ❌ |
| Quiz, Flashcards & Learning Units | 22 | 0 | 22 ❌ |
| Learning Path Generation | 10 | 0 | 10 ❌ |
| Chat History | 8 | 0 | 8 ❌ |
| Google Drive Integration | 14 | 0 | 14 ❌ |
| Document Processing Phases (5-phase) | 18 | 0 | 18 ❌ |
| Aggregation & Dashboard Endpoints | 12 | 0 | 12 ❌ |
| Health, Readiness & Observability | 10 | 0 | 10 ❌ |
| Pagination & Filtering | 12 | 0 | 12 ❌ |
| Notifications (MongoDB + Email + SSE) | 14 | 0 | 14 ❌ |
| Config, Env & Startup | 10 | 0 | 10 ❌ |
| **Total** | **421** | **45** | **376** |

---

## Category 11 — Workspace Collaboration & Invitations

### 11.1 Invite Collaborator
| Test | Expected | Priority |
|---|---|---|
| Owner invites user by email → invitation created, PENDING status | P1 |
| Owner invites non-existent email → 404 (gRPC/HTTP lookup fails) | P1 |
| Non-owner (VIEWER) invites someone → 403 | P1 |
| Invite email already a member → 409 or clear error | P1 |
| Invite with duplicate pending invitation → 409 or no duplicate | P2 |
| Invitation email sent on invite | Email dispatched | P1 |
| Invitation expires after 7 days → status EXPIRED | P2 |
| Resend invitation → resets to PENDING, new 7-day expiry | P2 |
| Cancel invitation → status EXPIRED, no longer in pending list | P2 |

### 11.2 Accept / Reject Invitation
| Test | Expected | Priority |
|---|---|---|
| Accept invitation → member added, invitation ACCEPTED | P1 |
| Accept invitation for another user → 403 | P1 |
| Accept already-accepted invitation → 409 or clear error | P1 |
| Accept expired invitation → 410 Gone or clear error | P1 |
| Reject invitation → invitation REJECTED, not added to workspace | P1 |
| `GET /invitations/pending` → shows all pending invitations with inviter name resolved | P1 |

### 11.3 Member Management
| Test | Expected | Priority |
|---|---|---|
| Update collaborator permission VIEWER → EDITOR | P1 |
| ADMIN cannot promote another user to ADMIN | P1 |
| ADMIN cannot modify another ADMIN's role | P1 |
| Optimistic lock conflict on role update (stale `version`) → 409 | P2 |
| Remove collaborator → no longer in member list | P1 |
| Leave workspace (self-remove) → 204 | P1 |
| Owner cannot leave their own workspace | P1 |
| Transfer ownership to existing member | P2 |
| Transfer ownership to non-member → 404 | P2 |
| `GET /collaborators` → cursor pagination works (next page token) | P2 |

---

## Category 12 — Quiz, Flashcards & Learning Units

### 12.1 Learning Unit Content
| Test | Expected | Priority |
|---|---|---|
| `GET /workspaces/{id}/units/content?unit_id=X` → returns summary, flashcards, quiz, problems | P1 |
| `GET /workspaces/{id}/units/content?unit_title=X` → lookup by title works | P1 |
| `GET` without `unit_id` or `unit_title` → 422 (one required) | P1 |
| `PUT /workspaces/{id}/units/content` by OWNER → saved correctly | P1 |
| `PUT` by VIEWER → 403 | P1 |
| Unit content served from Redis cache on repeat GET | P2 |
| Coding problem URLs canonicalized: LeetCode `/problems/X/` → normalized form | P2 |
| HackerRank and Codeforces URLs also canonicalized on save | P2 |

### 12.2 Quiz Submission
| Test | Expected | Priority |
|---|---|---|
| `PATCH /workspaces/{id}/units/quiz-progress` with correct answers → score calculated | P1 |
| Submit quiz with no answers → validation error | P1 |
| Submit quiz twice (re-attempt) → latest score stored or appended | P1 |
| Quiz score persisted in `UserQuizSubmissionModel` | P1 |
| `GET /workspaces/{id}/units/{unit_identifier}/quiz-leaderboard` → ranked list | P1 |
| Leaderboard shows multiple users who submitted | P2 |
| Leaderboard for unit with no submissions → empty list (not error) | P2 |

### 12.3 Flashcards
| Test | Expected | Priority |
|---|---|---|
| Flashcards in unit content are retrievable | P1 |
| Flashcard content renders front/back in UI | P2 |
| Empty flashcard list (unit with no flashcards) → empty array (not error) | P2 |

---

## Category 13 — Learning Path Generation

| Test | Expected | Priority |
|---|---|---|
| `POST /api/v1/workspaces/{id}/learning-path` (via gateway) → routed to **ai-service** (not workspace-service) | Special routing verified | P1 |
| ai-service generates structured learning path JSON from workspace topics | P1 |
| `GET /workspaces/{id}/learning-path` → returns saved learning path | P1 |
| `PUT /workspaces/{id}/learning-path` by OWNER → saves correctly | P1 |
| `PUT` by VIEWER → 403 | P1 |
| Learning path served from Redis cache on repeat GET | P2 |
| Learning path for workspace with no documents → meaningful empty response | P2 |
| Learning path unit count matches number of topics in workspace | P2 |
| Re-generate learning path → replaces old one | P2 |
| `GET /workspaces/{id}/topics` → returns current `topics_covered` string | P2 |

---

## Category 14 — Chat History

| Test | Expected | Priority |
|---|---|---|
| `GET /workspaces/{id}/chat` → returns saved messages array | P1 |
| `PUT /workspaces/{id}/chat` → saves full conversation (replaces) | P1 |
| `PUT` with empty messages array → clears history (valid) | P1 |
| `DELETE /workspaces/{id}/chat` → sets messages to [] | P1 |
| `PUT` by VIEWER → 403 | P1 |
| Chat history persists across browser sessions (not just memory) | P1 |
| Very long chat history (100+ messages) → stored and retrieved correctly | P2 |
| `PUT` with malformed JSON messages → 422 validation | P2 |

---

## Category 15 — Google Drive Integration

### 15.1 Normal Upload Flow
| Test | Expected | Priority |
|---|---|---|
| Raw upload → fetches Google OAuth token from identity-service first | Token fetch verified | P1 |
| Google Drive upload succeeds → `storage_file_id` and `webViewLink` stored in DB | P1 |
| Drive `webViewLink` converted from `/edit` to `/preview` | URL rewrite | P2 |
| Drive file set to `contentRestrictions: readOnly=True` after upload | View-only enforcement | P2 |
| Same file (SHA-256 match) uploaded twice → returns existing record, no re-upload | Idempotency | P1 |

### 15.2 Token Failure & Retry
| Test | Expected | Priority |
|---|---|---|
| Google OAuth token expired before upload → `force_refresh=true` triggered automatically | Auto-refresh | P1 |
| Drive returns 401 → refresh token and retry once | Retry on 401 | P1 |
| Drive returns 401 after retry (refresh also failed) → document FAILED with clear error | Double-failure | P1 |
| Token not found (user never completed Google OAuth) → upload blocked with clear error | P1 |
| `GET /profile/google-token` with `force_refresh=true` → refreshes even if not expired | Force refresh | P2 |
| `GET /profile/google-token` token expiring within 180s → proactively refreshes | Proactive refresh | P2 |

### 15.3 Drive Failures
| Test | Expected | Priority |
|---|---|---|
| Google Drive API unreachable during upload → document FAILED | P1 |
| Drive quota exceeded for user → document FAILED with quota error | P2 |
| Drive API returns 500 → document FAILED (no crash) | P2 |

---

## Category 16 — Document Processing: All 5 Phases

> Document-service has 5 explicit processing phases, each testable independently.

### Phase 1: Upload (`POST /documents/raw`)
| Test | Expected | Priority |
|---|---|---|
| Multipart upload with valid PDF → 201, status PROCESSING | P1 |
| PPTX upload → 201 | P1 |
| Allowed: `.docx, .pptx, .csv, .png, .jpg, .tiff, .xlsx` | P1 |
| Rejected: `.exe` (MZ magic bytes) → 415 | P1 |
| Rejected: `.sh` Linux ELF → 415 | P1 |
| Image upload > 10MB → 413 (hardcapped regardless of MAX_UPLOAD_SIZE_MB) | P1 |
| Valid file > MAX_UPLOAD_SIZE_MB → 413 | P1 |
| Background parse task triggered automatically after upload | P1 |

### Phase 2: Validate (`POST /documents/{id}/validate`)
| Test | Expected | Priority |
|---|---|---|
| Validate a successfully uploaded document → passes | P2 |
| Validate document with missing parts → validation error stored | P2 |

### Phase 3: Parse (`POST /documents/{id}/parse`)
| Test | Expected | Priority |
|---|---|---|
| Trigger parse → `parse_status` changes to PARSING | P1 |
| Parse completes → `parse_status = COMPLETED`, markdown stored | P1 |
| `GET /documents/{id}/markdown` → returns parsed markdown | P1 |
| `GET /documents/{id}/parts` → returns document parts | P2 |
| Reparse (`POST /documents/{id}/reparse`) → replaces old parse result | P2 |
| Parse fails (LlamaParse error) → `parse_status = FAILED`, error stored | P1 |

### Phase 4: Chunk (`POST /documents/{id}/chunks`)
| Test | Expected | Priority |
|---|---|---|
| Trigger chunking → `chunk_status = GENERATING` | P1 |
| Chunking completes → `chunk_status = COMPLETED`, chunks in DB | P1 |
| `GET /documents/{id}/chunks` → returns chunk list | P1 |
| `GET /documents/{id}/chunks/{chunk_id}` → returns single chunk | P2 |
| `GET /documents/workspaces/{ws_id}/chunks` → returns all chunks across all docs | P2 |
| `GET /documents/workspaces/{ws_id}/outline` → returns combined headings | P2 |
| Regenerate chunks → old chunks deleted, new ones created | P2 |

### Phase 5: Lifecycle (`POST /documents/{id}/archive`)
| Test | Expected | Priority |
|---|---|---|
| Archive document → status ARCHIVED, not in active list | P2 |
| Recover archived document → status returns to READY_FOR_RAG | P2 |
| `POST /documents/{id}/retry` on FAILED document → resets and retries | P1 |
| `DELETE /documents/{id}/processing` → cancels in-progress job | P2 |
| `GET /documents/{id}/processing` → returns job detail with progress | P2 |
| `GET /documents/{id}/status` → cached (Redis 60s TTL), returns parse + chunk status | P1 |

---

## Category 17 — Aggregation & Dashboard Endpoints

| Test | Expected | Priority |
|---|---|---|
| `GET /api/v1/dashboard` → returns workspaces + notifications in one call | P1 |
| Dashboard with no workspaces → `workspaces: []`, `unread_notifications: 0` | P1 |
| Dashboard shows correct `unread_notifications` count | P1 |
| `GET /api/v1/workspaces/{id}/overview` → returns workspace detail + document list | P1 |
| Overview with 0 documents → `total_documents: 0`, `documents: []` | P1 |
| `GET /api/v1/documents/{id}/overview` → returns doc + markdown snippet + first 3 chunks | P1 |
| Markdown snippet = first 500 chars of parsed markdown | P2 |
| Overview for unparsed document → `markdown_snippet: null` or empty | P2 |
| All aggregation endpoints fail gracefully if one upstream service is down | P2 |
| Dashboard parallel fetch: both services called concurrently (not sequentially) | P2 |
| `GET /workspaces/check-name?name=X` → `available: true` for unused name | P2 |
| `GET /workspaces/check-name?name=X` → `available: false` for taken name | P2 |

---

## Category 18 — Health, Readiness & Observability

| Test | Expected | Priority |
|---|---|---|
| `GET /health/live` → 200 (no downstream calls, always fast) | P1 |
| `GET /health/ready` → 200 when all 6 services healthy | P1 |
| `GET /health/ready` when one service is down → 503 | P1 |
| `GET /services/status` → shows each service health status individually | P2 |
| `X-Request-ID` header propagated to all upstream service calls | P2 |
| `X-Response-Time` header present in all gateway responses | P2 |
| `X-Content-Type-Options: nosniff` present in all responses | P2 |
| `X-Frame-Options: DENY` present in all responses | P2 |
| All services return `{"status": "ok"}` on their own `GET /api/v1/health` | P1 |
| Structured JSON logs contain `request_id`, `service`, `level` fields | P3 |

---

## Category 19 — Pagination & Filtering

| Test | Expected | Priority |
|---|---|---|
| `GET /workspaces?limit=5&offset=0` → first 5 workspaces | P1 |
| `GET /workspaces?limit=5&offset=5` → next 5 workspaces | P1 |
| `GET /workspaces?status=ARCHIVED` → only archived workspaces | P1 |
| `GET /workspaces?limit=0` → 422 (limit min is 1) | P2 |
| `GET /workspaces?limit=101` → 422 (limit max is 100) | P2 |
| `GET /workspaces/{id}/collaborators` → cursor pagination (not offset) | P2 |
| Cursor pagination: second page uses cursor from first response | P2 |
| `GET /workspaces/{id}/activities?page=1&limit=10` → first 10 activities | P2 |
| `GET /notifications?limit=50&offset=0` → sorted by `created_at DESC` | P1 |
| `GET /documents?workspace_id=X` → only documents in that workspace | P1 |
| `GET /documents/workspaces/{ws_id}/chunks?limit=20&offset=0` → paginated chunks | P2 |

---

## Category 20 — Notifications (MongoDB + Email + SSE)

### 20.1 Notification CRUD
| Test | Expected | Priority |
|---|---|---|
| `GET /notifications` → list user's notifications, newest first | P1 |
| `PATCH /notifications/{id}/read` → status changes to READ, `read_at` set | P1 |
| `PATCH /notifications/read-all` → all notifications marked READ | P1 |
| `read-all` returns `modified_count` matching unread count | P2 |
| Notification for another user not visible in own list | P1 |

### 20.2 Event Persistence & Email
| Test | Expected | Priority |
|---|---|---|
| `WorkspaceInvitationSent` event → email dispatched to invitee | P1 |
| SummaryGeneration PROCESSING event → NOT persisted to MongoDB (transient only) | P2 |
| SummaryGeneration COMPLETED event → persisted to MongoDB | P2 |
| LearningPathGeneration PROCESSING → transient SSE only | P2 |
| Duplicate event (same `event_id` + `user_id`) → not stored twice | P1 |

### 20.3 MongoDB Fallback
| Test | Expected | Priority |
|---|---|---|
| MongoDB unavailable → notification-service falls back to in-memory dict | P1 |
| In-memory fallback: notifications visible in same process instance | P2 |
| After MongoDB recovers, in-memory items not persisted (lost on restart) | P2 |

### 20.4 SSE Stream
| Test | Expected | Priority |
|---|---|---|
| `GET /notifications/stream` → SSE connection established | P1 |
| Keep-alive `:keep-alive` sent every 15s on idle connection | P2 |
| Event received within 5s of being published | P1 |
| SSE disconnects cleanly when client closes connection | P2 |

---

## Category 21 — Configuration, Environment & Service Startup

| Test | Expected | Priority |
|---|---|---|
| Identity-service starts without `GOOGLE_CLIENT_ID` → clear startup error | P1 |
| ai-service starts without `GEMINI_API_KEY` → clear error on first AI call | P1 |
| document-service starts without `LLAMA_CLOUD_API_KEY` → parse fails clearly | P1 |
| JWT_ACCESS_EXPIRE_MINUTES=30 → access token expires exactly at 30 min | P1 |
| JWT_REFRESH_EXPIRE_DAYS=30 → refresh token invalid after 30 days | P2 |
| `APP_ENV=development` → CORS allows all origins (`*`) | P2 |
| Service startup order: dependent services wait for healthcheck | P2 |
| api-gateway `/health/ready` returns 503 if any service fails to start | P1 |
| `MAX_UPLOAD_SIZE_MB` env var changes enforce new limit immediately | P2 |
| All services recover from a cold restart in correct order (postgres → redis → rabbitmq → services → gateway) | P2 |

---

## Category 22 — No Rate Limiting (Gap Documentation)

> **Finding:** Zero rate limiting exists anywhere in the project. No `slowapi`, `RateLimiter`, or `throttle` found in any service.

| Vulnerability / Test | Impact | Priority |
|---|---|---|
| Brute-force login (1000 attempts in 1s) → no throttle, all requests processed | High security gap | P1 |
| Mass OAuth login initiation (1000 /oauth/google/login) → no throttle | Medium | P2 |
| Mass RAG chat spam (100 req/s) → Gemini API quota exhausted | High operational gap | P1 |
| Mass document upload → Google Drive and LlamaParse quotas at risk | P2 |
| Mass notification requests → MongoDB overloaded | P2 |
| **Recommendation:** Add `slowapi` to at minimum: login, RAG chat, document upload | — | P1 |

---

## Category 23 — Mutation & Fault Injection Testing

> Verifies the effectiveness of existing unit test suites by deliberately modifying code logic (e.g., swapping `<` for `<=`, flipping boolean checks, deleting cache invalidations) and ensuring test suites catch the mutations (Target: >80% Mutation Score).

| Test Area | Mutation Injected | Expected Test Result | Priority |
|---|---|---|---|
| RAG Similarity Guardrail | Flip threshold check `similarity >= 0.35` to `< 0.35` | Unit test fails immediately | P1 |
| Optimistic Locking | Remove `version = version + 1` from member role update | Concurrency unit test catches dirty write | P1 |
| Token Expiration | Change JWT expiration logic from `+ timedelta` to `- timedelta` | Auth unit test catches expired token | P1 |
| Cache Invalidation | Comment out `cache.invalidate_workspace_documents()` | Integration test detects stale read | P2 |
| Cascade Deletion | Comment out repository `delete_by_workspace_id` in consumer | Consumer test detects orphaned records | P1 |

---

## Category 24 — Contract & API Schema Evolution Testing

> Ensures backward compatibility between microservices and prevents breaking API changes across gateway and consumers.

| Test | Validation Target | Priority |
|---|---|---|
| OpenAPI Spec Schema Drift | Validate exported OpenAPI schema against frontend Axios TypeScript/JS interfaces | P1 |
| Protobuf / gRPC Backward Compatibility | Verify adding new optional fields to `.proto` files does not break running older clients | P1 |
| RabbitMQ DomainEvent Envelope Schema | Validate all published JSON payloads strictly adhere to `DomainEvent` Pydantic model | P1 |
| Deprecated Field Grace Period | Test that renaming or deprecating response fields returns backwards-compatible aliases | P2 |

---

## Category 25 — Database Migration, Rollback & Data Integrity

> Tests database schema versioning, rollback safety, and cross-database transaction atomicity.

| Test | Validation Target | Priority |
|---|---|---|
| Clean DB Seed from Scratch | All PostgreSQL DDL triggers, indexes, and tables initialize cleanly in fresh container | P1 |
| Schema Migration Rollback | Test `alembic downgrade -1` cleanly rolls back without orphan columns or locks | P2 |
| Foreign Key Cascade Integrity | Verify deleting user record in `identity_db` cascades to `sessions`, `refresh_tokens`, `oauth_identities` | P1 |
| Multi-Database Isolation | Ensure document-service cannot execute cross-database queries directly without API/Event boundary | P2 |
| PgVector Index Rebuild | Verify `REINDEX INDEX idx_doc_chunks_embedding_hnsw` executes without query interruption | P2 |

---

## Category 26 — Disaster Recovery, Backup & Restore Testing

> Verifies backup integrity and data restoration procedures under catastrophic failure scenarios.

| Test | Procedure / Target | Priority |
|---|---|---|
| PostgreSQL Backup & Restore | `pg_dumpall` backup restores completely to new container with zero data loss | P1 |
| MongoDB Notification Snapshot | `mongodump` & `mongorestore` restores all historical user notifications | P2 |
| Vector Index Reconstruction | Re-run embedding generator on raw document chunks to rebuild PgVector table from zero | P1 |
| Storage Provider Recovery | Verify local storage files can be re-indexed after temporary volume remount | P2 |
| Recovery Time Objective (RTO) | Complete cold restore of all databases & microservices under 10 minutes | P2 |

---

## Category 27 — Accessibility (a11y) & Cross-Browser Testing

> Ensures compliance with WCAG 2.1 AA standards and seamless operation across diverse browser rendering engines.

| Test | Tool / Requirement | Priority |
|---|---|---|
| Keyboard Navigation (Tab Index) | Complete login, workspace navigation, document upload, and chat using keyboard only | P1 |
| Screen Reader Compatibility (ARIA) | Modals, citation badges, and chat message streams have proper `aria-live` and `role` tags | P2 |
| Color Contrast & Theme Ratios | All text elements meet 4.5:1 minimum contrast ratio in both Light and Dark themes | P2 |
| Cross-Browser Compatibility | UI tested and rendered pixel-perfect across Chrome, Firefox, Safari (WebKit), and MS Edge | P1 |
| Mobile Viewport Touch Targets | All clickable buttons and icons meet 48x48px minimum touch target size on iOS/Android | P2 |

---

## Category 28 — Frontend State, Error Boundaries & Offline Resilience

> Tests React client resilience against network drops, API latency, and unexpected runtime errors.

| Test | Expected Client Behavior | Priority |
|---|---|---|
| React Error Boundary Catch | Runtime render crash inside Chat component shows friendly fallback UI, not blank white screen | P1 |
| Network Offline Interruption | Display "Offline - Reconnecting" banner when browser loses internet connection | P1 |
| SSE Auto-Reconnect | Re-establish EventSource connection with exponential backoff on network drop | P1 |
| React Query Optimistic Updates | Optimistic deletion of document / workspace updates UI instantly, rolls back on API error | P2 |
| LocalStorage Token Corruption | Tampered or malformed token in browser storage triggers clean redirect to `/login` | P1 |

---

## Final Master Total — All 28 Categories

| # | Category | Tests Planned | Existing | Missing |
|---|---|---|---|---|
| 1 | Unit Tests (Core Logic) | 55 | 44 ✅ | 11 ❌ |
| 2 | OAuth Flow (Cancel, CSRF, Token Lifecycle) | 32 | 0 | 32 ❌ |
| 3 | Cross-Service (RabbitMQ + gRPC + SSE + HTTP) | 45 | 0 | 45 ❌ |
| 4 | API / End-to-End User Flows | 35 | 0 | 35 ❌ |
| 5 | Document Processing Pipeline | 11 | 0 | 11 ❌ |
| 6 | Security & Access Control | 18 | 0 | 18 ❌ |
| 7 | Performance, Load & Stress Tests | 15 | 1 (manual) | 14 ❌ |
| 8 | UI / UX Frontend Tests | 20 | 0 | 20 ❌ |
| 9 | Edge Cases & Boundary Conditions | 26 | 0 | 26 ❌ |
| 10 | Known Architectural Gaps (Behavioral) | 12 | 0 | 12 ❌ |
| 11 | Workspace Collaboration & Invitations | 28 | 0 | 28 ❌ |
| 12 | Quiz, Flashcards & Learning Units | 22 | 0 | 22 ❌ |
| 13 | Learning Path Generation | 10 | 0 | 10 ❌ |
| 14 | Chat History Persistence | 8 | 0 | 8 ❌ |
| 15 | Google Drive & Local Storage Integration | 14 | 0 | 14 ❌ |
| 16 | Document Processing (All 5 Lifecycle Phases) | 18 | 0 | 18 ❌ |
| 17 | Aggregation & Dashboard Endpoints | 12 | 0 | 12 ❌ |
| 18 | Health, Readiness & Observability | 10 | 0 | 10 ❌ |
| 19 | Pagination, Filtering & Sorting | 11 | 0 | 11 ❌ |
| 20 | Notifications (MongoDB + Email + SSE) | 14 | 0 | 14 ❌ |
| 21 | Configuration, Env & Cold Startup | 10 | 0 | 10 ❌ |
| 22 | Rate Limiting & DoS Protection (Gap) | 6 | 0 | 6 ❌ |
| 23 | Mutation & Fault Injection Testing | 5 | 0 | 5 ❌ |
| 24 | Contract & API Schema Evolution | 4 | 0 | 4 ❌ |
| 25 | Database Migration, Rollback & Integrity | 5 | 0 | 5 ❌ |
| 26 | Disaster Recovery & Backup / Restore | 5 | 0 | 5 ❌ |
| 27 | Accessibility (a11y) & Cross-Browser | 5 | 0 | 5 ❌ |
| 28 | Frontend State & Offline Resilience | 5 | 0 | 5 ❌ |
| **TOTAL** | **ALL 28 CATEGORIES** | **466** | **45** | **421** |

---

*Exhaustive test plan — full source audit of all 7 microservices, shared layer, docker-compose, frontend React SPA, and all API routers.*
*CPA-V2 Capstone Project | CSE | Year 5 Semester 9 | 2026-08-18*
