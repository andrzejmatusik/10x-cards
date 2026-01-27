# REST API Plan - 10xCards

## 1. Resources

### Core Resources
- **flashcards** - Maps to `flashcards` table - User's flashcards (AI-generated or manual)
- **generations** - Maps to `generations` table - Records of AI generation attempts
- **study-sessions** - Virtual resource - Manages spaced repetition learning sessions
- **users** - Maps to `users` table (managed by Supabase Auth)

## 2. Endpoints

### 2.1. Authentication (Supabase Auth)

These endpoints are provided by Supabase Auth service.

#### Register User
- **Method**: POST
- **Path**: `/auth/v1/signup`
- **Description**: Register a new user account
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
- **Response** (201 Created):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "created_at": "2025-01-27T10:00:00Z"
  }
}
```
- **Error Responses**:
  - 400 Bad Request: Invalid email format or weak password
  - 422 Unprocessable Entity: Email already exists

#### Login
- **Method**: POST
- **Path**: `/auth/v1/token?grant_type=password`
- **Description**: Authenticate user and receive access token
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
- **Response** (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```
- **Error Responses**:
  - 400 Bad Request: Invalid credentials
  - 401 Unauthorized: Account not confirmed

#### Refresh Token
- **Method**: POST
- **Path**: `/auth/v1/token?grant_type=refresh_token`
- **Description**: Refresh expired access token
- **Request Body**:
```json
{
  "refresh_token": "..."
}
```
- **Response** (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

#### Get Current User
- **Method**: GET
- **Path**: `/auth/v1/user`
- **Description**: Get authenticated user's information
- **Headers**: `Authorization: Bearer {access_token}`
- **Response** (200 OK):
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "created_at": "2025-01-27T10:00:00Z",
  "confirmed_at": "2025-01-27T10:05:00Z"
}
```
- **Error Responses**:
  - 401 Unauthorized: Invalid or expired token

---

### 2.2. Flashcards

All flashcard endpoints require authentication via `Authorization: Bearer {access_token}` header.

#### List User's Flashcards
- **Method**: GET
- **Path**: `/api/flashcards`
- **Description**: Retrieve paginated list of user's flashcards
- **Query Parameters**:
  - `limit` (optional, default: 50, max: 100) - Number of results per page
  - `cursor` (optional) - Cursor for pagination (flashcard ID)
  - `source` (optional) - Filter by source: 'ai-full', 'ai-edited', 'manual'
  - `generation_id` (optional) - Filter by specific generation
- **Response** (200 OK):
```json
{
  "data": [
    {
      "id": 123,
      "front": "What is spaced repetition?",
      "back": "A learning technique that involves reviewing information at increasing intervals",
      "source": "ai-full",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z",
      "generation_id": 45,
      "user_id": "uuid-here"
    }
  ],
  "pagination": {
    "next_cursor": 150,
    "has_more": true
  }
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 400 Bad Request: Invalid query parameters

#### Get Single Flashcard
- **Method**: GET
- **Path**: `/api/flashcards/:id`
- **Description**: Retrieve a specific flashcard by ID
- **Response** (200 OK):
```json
{
  "id": 123,
  "front": "What is spaced repetition?",
  "back": "A learning technique that involves reviewing information at increasing intervals",
  "source": "ai-full",
  "created_at": "2025-01-27T10:00:00Z",
  "updated_at": "2025-01-27T10:00:00Z",
  "generation_id": 45,
  "user_id": "uuid-here"
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 404 Not Found: Flashcard doesn't exist or doesn't belong to user

#### Create Manual Flashcard
- **Method**: POST
- **Path**: `/api/flashcards`
- **Description**: Create a new flashcard manually
- **Request Body**:
```json
{
  "front": "What is the capital of France?",
  "back": "Paris"
}
```
- **Response** (201 Created):
```json
{
  "id": 124,
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "created_at": "2025-01-27T11:00:00Z",
  "updated_at": "2025-01-27T11:00:00Z",
  "generation_id": null,
  "user_id": "uuid-here"
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 400 Bad Request: Missing required fields or validation errors
    - front: required, max 200 characters
    - back: required, max 500 characters

#### Create Batch Flashcards from Generation
- **Method**: POST
- **Path**: `/api/flashcards/batch`
- **Description**: Create multiple flashcards from AI generation (user accepts/edits proposals)
- **Request Body**:
```json
{
  "generation_id": 45,
  "flashcards": [
    {
      "front": "What is spaced repetition?",
      "back": "A learning technique...",
      "source": "ai-full"
    },
    {
      "front": "What is active recall?",
      "back": "A study method where you actively stimulate memory (edited by user)",
      "source": "ai-edited"
    }
  ]
}
```
- **Response** (201 Created):
```json
{
  "created_count": 2,
  "flashcards": [
    {
      "id": 125,
      "front": "What is spaced repetition?",
      "back": "A learning technique...",
      "source": "ai-full",
      "generation_id": 45,
      "created_at": "2025-01-27T11:00:00Z"
    },
    {
      "id": 126,
      "front": "What is active recall?",
      "back": "A study method where you actively stimulate memory (edited by user)",
      "source": "ai-edited",
      "generation_id": 45,
      "created_at": "2025-01-27T11:00:00Z"
    }
  ]
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 400 Bad Request: Validation errors or invalid generation_id
  - 404 Not Found: Generation doesn't exist or doesn't belong to user

#### Update Flashcard
- **Method**: PUT
- **Path**: `/api/flashcards/:id`
- **Description**: Update an existing flashcard (edits automatically update source if applicable)
- **Request Body**:
```json
{
  "front": "Updated question?",
  "back": "Updated answer"
}
```
- **Response** (200 OK):
```json
{
  "id": 123,
  "front": "Updated question?",
  "back": "Updated answer",
  "source": "ai-edited",
  "created_at": "2025-01-27T10:00:00Z",
  "updated_at": "2025-01-27T12:00:00Z",
  "generation_id": 45,
  "user_id": "uuid-here"
}
```
- **Business Logic**: If original source was 'ai-full' and content is modified, automatically change source to 'ai-edited'
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 404 Not Found: Flashcard doesn't exist or doesn't belong to user
  - 400 Bad Request: Validation errors (max lengths exceeded)

#### Delete Flashcard
- **Method**: DELETE
- **Path**: `/api/flashcards/:id`
- **Description**: Permanently delete a flashcard
- **Response** (204 No Content): Empty body
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 404 Not Found: Flashcard doesn't exist or doesn't belong to user

---

### 2.3. Generations

All generation endpoints require authentication.

#### Generate Flashcards from Text
- **Method**: POST
- **Path**: `/api/generations`
- **Description**: Send text to LLM and generate flashcard proposals
- **Request Body**:
```json
{
  "source_text": "Long text content here (1000-10000 characters)...",
  "model": "openai/gpt-4"
}
```
- **Response** (201 Created):
```json
{
  "id": 46,
  "user_id": "uuid-here",
  "model": "openai/gpt-4",
  "generated_count": 5,
  "accepted_unedited_count": null,
  "accepted_edited_count": null,
  "source_text_hash": "abc123...",
  "source_text_length": 2500,
  "generation_duration": 3450,
  "created_at": "2025-01-27T13:00:00Z",
  "proposed_flashcards": [
    {
      "front": "What is spaced repetition?",
      "back": "A learning technique that involves reviewing information at increasing intervals"
    },
    {
      "front": "What is active recall?",
      "back": "A study method where you actively stimulate memory during learning"
    }
  ]
}
```
- **Business Logic**:
  - Calculate source_text_hash (SHA-256) for deduplication
  - Call Openrouter.ai API with source text
  - Measure generation_duration
  - Store proposed flashcards temporarily (returned in response)
  - If LLM call fails, create record in generation_error_logs
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 400 Bad Request: Text length not between 1000-10000 characters
  - 422 Unprocessable Entity: LLM generation failed
  - 429 Too Many Requests: Rate limit exceeded (max 10 generations per hour)

#### List User's Generations
- **Method**: GET
- **Path**: `/api/generations`
- **Description**: Retrieve user's generation history with statistics
- **Query Parameters**:
  - `limit` (optional, default: 20, max: 50)
  - `cursor` (optional) - Cursor for pagination
- **Response** (200 OK):
```json
{
  "data": [
    {
      "id": 46,
      "model": "openai/gpt-4",
      "generated_count": 5,
      "accepted_unedited_count": 3,
      "accepted_edited_count": 1,
      "source_text_length": 2500,
      "generation_duration": 3450,
      "created_at": "2025-01-27T13:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": 45,
    "has_more": true
  }
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token

#### Get Single Generation
- **Method**: GET
- **Path**: `/api/generations/:id`
- **Description**: Retrieve details of a specific generation
- **Response** (200 OK):
```json
{
  "id": 46,
  "user_id": "uuid-here",
  "model": "openai/gpt-4",
  "generated_count": 5,
  "accepted_unedited_count": 3,
  "accepted_edited_count": 1,
  "source_text_hash": "abc123...",
  "source_text_length": 2500,
  "generation_duration": 3450,
  "created_at": "2025-01-27T13:00:00Z",
  "flashcards": [
    {
      "id": 125,
      "front": "What is spaced repetition?",
      "back": "A learning technique...",
      "source": "ai-full"
    }
  ]
}
```
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 404 Not Found: Generation doesn't exist or doesn't belong to user

---

### 2.4. Study Sessions

Study session endpoints manage the spaced repetition learning flow.

#### Get Study Session
- **Method**: GET
- **Path**: `/api/study-sessions`
- **Description**: Retrieve flashcards due for review based on spaced repetition algorithm
- **Query Parameters**:
  - `limit` (optional, default: 20, max: 50) - Number of cards in session
- **Response** (200 OK):
```json
{
  "session_id": "temp-session-uuid",
  "total_due": 15,
  "flashcards": [
    {
      "id": 123,
      "front": "What is spaced repetition?",
      "back": "A learning technique...",
      "repetition_data": {
        "ease_factor": 2.5,
        "interval": 1,
        "repetitions": 0,
        "next_review": "2025-01-27T00:00:00Z"
      }
    }
  ]
}
```
- **Business Logic**: External spaced repetition algorithm determines which cards are due
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token

#### Record Flashcard Review
- **Method**: PUT
- **Path**: `/api/flashcards/:id/review`
- **Description**: Record user's self-assessment after reviewing a flashcard
- **Request Body**:
```json
{
  "quality": 4
}
```
- **Parameters**:
  - `quality` (integer, 0-5) - User's self-assessment:
    - 0: Complete blackout
    - 1: Incorrect response, correct one remembered
    - 2: Incorrect response, correct one seemed easy to recall
    - 3: Correct response, but difficult to recall
    - 4: Correct response, after some hesitation
    - 5: Perfect response
- **Response** (200 OK):
```json
{
  "id": 123,
  "repetition_data": {
    "ease_factor": 2.6,
    "interval": 6,
    "repetitions": 1,
    "next_review": "2025-02-02T00:00:00Z"
  }
}
```
- **Business Logic**: Update flashcard's repetition metadata using external algorithm (e.g., SM-2)
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token
  - 404 Not Found: Flashcard doesn't exist or doesn't belong to user
  - 400 Bad Request: Invalid quality value (must be 0-5)

---

### 2.5. User Management

#### Delete User Account
- **Method**: DELETE
- **Path**: `/api/users/me`
- **Description**: Delete current user's account and all associated data (GDPR compliance)
- **Response** (204 No Content): Empty body
- **Business Logic**:
  - Cascading delete all flashcards
  - Delete all generations
  - Delete all generation_error_logs
  - Delete user from Supabase Auth
- **Error Responses**:
  - 401 Unauthorized: Missing or invalid token

---

## 3. Authentication and Authorization

### Authentication Mechanism
- **Type**: JWT (JSON Web Tokens) provided by Supabase Auth
- **Token Placement**: `Authorization: Bearer {access_token}` header
- **Token Lifetime**: 3600 seconds (1 hour)
- **Refresh**: Use refresh token to obtain new access token via `/auth/v1/token?grant_type=refresh_token`

### Authorization Strategy
- **Row-Level Security (RLS)**: Implemented at database level in Supabase
- **Policy**: Users can only access resources where `user_id` matches `auth.uid()`
- **Enforcement**: All API endpoints validate user ownership before operations
- **Automatic**: RLS policies automatically filter queries by authenticated user

### Security Measures
1. **Rate Limiting**:
   - POST `/api/generations`: 10 requests per hour per user
   - Other endpoints: 100 requests per minute per user

2. **Input Validation**:
   - All input sanitized to prevent XSS
   - SQL injection prevented by parameterized queries
   - File upload not supported (text input only)

3. **HTTPS Only**: All API communication must use HTTPS in production

4. **CORS**: Configure allowed origins based on frontend domain

---

## 4. Validation and Business Logic

### Flashcards Resource

#### Validation Rules
- `front`: Required, string, max 200 characters, min 1 character
- `back`: Required, string, max 500 characters, min 1 character
- `source`: Required (auto-set), enum ['ai-full', 'ai-edited', 'manual']
- `user_id`: Required (auto-set from auth token)
- `generation_id`: Optional, must reference existing generation owned by user

#### Business Logic
1. **Manual Creation** (POST `/api/flashcards`):
   - Automatically set `source = 'manual'`
   - Set `generation_id = null`
   - Set `user_id` from authenticated user

2. **Batch Creation** (POST `/api/flashcards/batch`):
   - Validate that `generation_id` belongs to user
   - Accept `source` as 'ai-full' or 'ai-edited' from request
   - After creation, update generation record:
     - Count flashcards with `source = 'ai-full'` → `accepted_unedited_count`
     - Count flashcards with `source = 'ai-edited'` → `accepted_edited_count`

3. **Update** (PUT `/api/flashcards/:id`):
   - If flashcard's current `source = 'ai-full'` and content changes, set `source = 'ai-edited'`
   - Automatically update `updated_at` timestamp (via database trigger)
   - Only allow updating `front` and `back` fields

4. **Delete** (DELETE `/api/flashcards/:id`):
   - Permanent deletion (no soft delete in MVP)
   - Does not update generation statistics (accepted counts remain historical)

### Generations Resource

#### Validation Rules
- `source_text`: Required, string, min 1000 characters, max 10000 characters
- `model`: Required, string, valid model identifier from Openrouter.ai
- `source_text_length`: Auto-calculated, integer, must be 1000-10000
- `source_text_hash`: Auto-calculated, string (SHA-256 hash)
- `generation_duration`: Auto-calculated, integer (milliseconds)
- `generated_count`: Auto-calculated, integer (count of proposed flashcards)

#### Business Logic
1. **AI Generation** (POST `/api/generations`):
   - Validate source_text length (1000-10000 chars)
   - Calculate `source_text_hash` using SHA-256 for deduplication detection
   - Record start timestamp
   - Call Openrouter.ai API:
     - Endpoint: https://openrouter.ai/api/v1/chat/completions
     - Include API key from environment
     - Request structured JSON response with flashcard proposals
   - Record end timestamp and calculate `generation_duration`
   - Count proposed flashcards → `generated_count`
   - If API call succeeds:
     - Create generation record with `accepted_unedited_count = null`, `accepted_edited_count = null`
     - Return generation record + proposed flashcards (not saved yet)
   - If API call fails:
     - Create record in `generation_error_logs` with error details
     - Return 422 error to client

2. **Statistics Tracking**:
   - `accepted_unedited_count` and `accepted_edited_count` initially null
   - Updated when user saves flashcards via POST `/api/flashcards/batch`
   - These counts reflect final acceptance decisions, not interim changes

### Study Sessions Resource

#### Validation Rules
- `quality`: Required, integer, must be 0-5

#### Business Logic
1. **Get Session** (GET `/api/study-sessions`):
   - Query flashcards with spaced repetition metadata
   - Use external algorithm (e.g., SM-2 implementation) to determine due cards
   - Filter by `next_review <= current_timestamp`
   - Order by priority (oldest due first)
   - Limit results based on query parameter

2. **Record Review** (PUT `/api/flashcards/:id/review`):
   - Accept quality rating (0-5)
   - Apply spaced repetition algorithm (SM-2):
     - Calculate new ease factor
     - Calculate new interval
     - Increment repetition count
     - Calculate next review date
   - Update flashcard's repetition metadata
   - Return updated scheduling information

### Error Handling

#### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Front text exceeds maximum length of 200 characters",
    "details": {
      "field": "front",
      "constraint": "max_length",
      "max": 200,
      "actual": 250
    }
  }
}
```

#### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: User doesn't have access to resource
- `NOT_FOUND`: Resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `LLM_GENERATION_FAILED`: AI service error
- `INTERNAL_ERROR`: Unexpected server error

### GDPR Compliance

1. **Data Access**: Users can retrieve all their data via existing GET endpoints
2. **Data Deletion**: DELETE `/api/users/me` implements "right to be forgotten"
3. **Data Portability**: All data returned in standard JSON format
4. **Data Minimization**: Only collect necessary data (no tracking beyond product requirements)
5. **Cascading Deletion**: Account deletion automatically removes:
   - All flashcards
   - All generations
   - All generation_error_logs
   - User account from Supabase Auth

---

## 5. Additional Considerations

### Pagination Strategy
- **Type**: Cursor-based pagination (more efficient for large datasets)
- **Parameters**: `limit` (page size) and `cursor` (last item ID from previous page)
- **Response**: Include `next_cursor` and `has_more` in pagination object

### API Versioning
- **Current Version**: v1 (implicit, no version in URL for MVP)
- **Future**: If breaking changes needed, introduce `/api/v2/` prefix

### Rate Limiting Headers
Include in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706356800
```

### Monitoring and Logging
- Log all generation requests and results for quality analysis
- Track acceptance rates (generated vs accepted flashcards)
- Monitor LLM API costs and response times
- Alert on error rates > 5%
