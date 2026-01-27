# API Endpoint Implementation Plan: List User's Flashcards

## 1. Endpoint Overview

**Purpose**: Retrieve a paginated list of all flashcards belonging to the authenticated user, with optional filtering capabilities.

**Functionality**:
- Returns user's flashcards in paginated format using cursor-based pagination
- Supports filtering by source type (manual, ai-full, ai-edited)
- Supports filtering by generation_id
- Automatically enforces user ownership through RLS
- Returns metadata for pagination (next_cursor, has_more)

**Business Context**: This endpoint supports the PRD requirements (US-004, US-005, US-006) by providing users access to their flashcard collection for review, editing, and management.

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
`/api/flashcards`

### Authentication Required
Yes - JWT Bearer token in Authorization header

### Headers
```
Authorization: Bearer {access_token}
```

### Request Parameters

#### Path Parameters
None

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Number of results per page (max: 100) |
| `cursor` | integer | No | - | Flashcard ID for pagination (last item from previous page) |
| `source` | string | No | - | Filter by source: 'ai-full', 'ai-edited', or 'manual' |
| `generation_id` | integer | No | - | Filter flashcards from specific generation |

**Query String Examples**:
```
/api/flashcards
/api/flashcards?limit=20
/api/flashcards?limit=20&cursor=150
/api/flashcards?source=ai-full
/api/flashcards?generation_id=45
/api/flashcards?limit=30&source=manual&cursor=200
```

#### Request Body
None

## 3. Types Used

### DTOs
```typescript
import {
  ListFlashcardsQuery,
  ListFlashcardsResponse,
  FlashcardDTO,
  PaginationMeta,
  FlashcardSource,
  ApiErrorResponse,
  PaginationConstraints,
  isFlashcardSource
} from '@/types';
```

### Database Types
```typescript
import type { Database } from '@/db/database.types';
```

### Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
```

## 4. Response Details

### Success Response (200 OK)

#### Without Filters
```json
{
  "data": [
    {
      "id": 150,
      "front": "What is spaced repetition?",
      "back": "A learning technique that involves reviewing information at increasing intervals",
      "source": "ai-full",
      "created_at": "2025-01-27T10:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z",
      "generation_id": 45,
      "user_id": "uuid-here"
    },
    {
      "id": 149,
      "front": "What is the capital of France?",
      "back": "Paris",
      "source": "manual",
      "created_at": "2025-01-27T09:30:00Z",
      "updated_at": "2025-01-27T09:30:00Z",
      "generation_id": null,
      "user_id": "uuid-here"
    }
  ],
  "pagination": {
    "next_cursor": 148,
    "has_more": true
  }
}
```

#### With Filters (source=manual)
```json
{
  "data": [
    {
      "id": 149,
      "front": "What is the capital of France?",
      "back": "Paris",
      "source": "manual",
      "created_at": "2025-01-27T09:30:00Z",
      "updated_at": "2025-01-27T09:30:00Z",
      "generation_id": null,
      "user_id": "uuid-here"
    }
  ],
  "pagination": {
    "next_cursor": 120,
    "has_more": true
  }
}
```

#### Last Page (no more results)
```json
{
  "data": [
    {
      "id": 1,
      "front": "First flashcard",
      "back": "First answer",
      "source": "manual",
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-01-20T10:00:00Z",
      "generation_id": null,
      "user_id": "uuid-here"
    }
  ],
  "pagination": {
    "has_more": false
  }
}
```

**Response Type**: `ListFlashcardsResponse`

**Ordering**: Results ordered by `id DESC` (newest first)

### Error Responses

#### 400 Bad Request - Invalid Query Parameters
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid limit parameter. Must be between 1 and 100",
    "details": {
      "field": "limit",
      "constraint": "range",
      "min": 1,
      "max": 100,
      "actual": 150
    }
  }
}
```

**Common validation scenarios**:
- limit exceeds maximum (100)
- limit is less than 1
- limit is not an integer
- cursor is not a valid integer
- source is not one of: 'ai-full', 'ai-edited', 'manual'
- generation_id is not a valid integer

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

**Triggers**:
- No Authorization header provided
- Invalid JWT token
- Expired JWT token
- Token signature verification failed

#### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 100 requests per minute allowed"
  }
}
```

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706356860
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred while retrieving flashcards"
  }
}
```

## 5. Data Flow

### Flow Diagram
```
Client Request (GET /api/flashcards?limit=20&source=manual)
    ↓
Authentication Middleware (JWT verification)
    ↓
Rate Limiting Middleware (100 req/min check)
    ↓
Query Parameter Validation & Parsing
    ↓
FlashcardService.listUserFlashcards(query, userId)
    ↓
Build Supabase Query:
  - Base: SELECT * FROM flashcards
  - Filter: WHERE user_id = {userId} (via RLS)
  - Apply source filter (if provided)
  - Apply generation_id filter (if provided)
  - Apply cursor filter: WHERE id < {cursor}
  - Order: ORDER BY id DESC
  - Limit: LIMIT {limit + 1} (to check has_more)
    ↓
Execute Query via Supabase Client
    ↓
RLS Policy Check (user_id = auth.uid())
    ↓
Database Query Execution
    ↓
Process Results:
  - Check if count > limit (has_more = true)
  - Take first {limit} items
  - Set next_cursor to last item's id
    ↓
Format Response (ListFlashcardsResponse)
    ↓
Response to Client (200 OK)
```

### Database Interaction

1. **Query Builder Pattern**:
```typescript
let query = supabase
  .from('flashcards')
  .select('*')
  .order('id', { ascending: false });

// Apply filters conditionally
if (source) {
  query = query.eq('source', source);
}

if (generation_id) {
  query = query.eq('generation_id', generation_id);
}

if (cursor) {
  query = query.lt('id', cursor);
}

// Fetch limit + 1 to determine has_more
query = query.limit(limit + 1);

const { data, error } = await query;
```

2. **RLS Policy Enforcement**:
   - Database automatically filters by `user_id = auth.uid()`
   - No additional WHERE clause needed for user_id
   - User can only see their own flashcards

3. **Indexes Used**:
   - `user_id` index (for RLS filtering)
   - `generation_id` index (for generation_id filter)
   - Primary key `id` index (for ordering and cursor)

4. **Pagination Logic**:
```typescript
const hasMore = data.length > limit;
const flashcards = hasMore ? data.slice(0, limit) : data;
const nextCursor = hasMore ? flashcards[flashcards.length - 1].id : undefined;
```

## 6. Security Considerations

### Authentication
- **Mechanism**: JWT Bearer token provided by Supabase Auth
- **Verification**: Middleware extracts and verifies token signature
- **Token Lifetime**: 3600 seconds (1 hour)
- **User Context**: Extract user_id from verified JWT payload

### Authorization
- **Row-Level Security (RLS)**: Enforced at database level
- **Policy**: User can only SELECT flashcards where user_id matches auth.uid()
- **Automatic Enforcement**: Supabase automatically applies RLS to all queries
- **No Data Leakage**: Impossible to access other users' flashcards

### Input Validation

#### Query Parameter Sanitization
```typescript
function validateListFlashcardsQuery(
  searchParams: URLSearchParams
): ListFlashcardsQuery {
  const query: ListFlashcardsQuery = {};

  // Validate limit
  const limitParam = searchParams.get('limit');
  if (limitParam) {
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1) {
      throw new ValidationError('limit', 'invalid', {
        message: 'Limit must be a positive integer'
      });
    }
    if (limit > PaginationConstraints.FLASHCARDS_MAX_LIMIT) {
      throw new ValidationError('limit', 'range', {
        message: `Limit must not exceed ${PaginationConstraints.FLASHCARDS_MAX_LIMIT}`,
        max: PaginationConstraints.FLASHCARDS_MAX_LIMIT,
        actual: limit
      });
    }
    query.limit = limit;
  }

  // Validate cursor
  const cursorParam = searchParams.get('cursor');
  if (cursorParam) {
    const cursor = parseInt(cursorParam, 10);
    if (isNaN(cursor) || cursor < 1) {
      throw new ValidationError('cursor', 'invalid', {
        message: 'Cursor must be a positive integer'
      });
    }
    query.cursor = cursor;
  }

  // Validate source
  const sourceParam = searchParams.get('source');
  if (sourceParam) {
    if (!isFlashcardSource(sourceParam)) {
      throw new ValidationError('source', 'invalid', {
        message: 'Source must be one of: ai-full, ai-edited, manual',
        allowed: ['ai-full', 'ai-edited', 'manual'],
        actual: sourceParam
      });
    }
    query.source = sourceParam;
  }

  // Validate generation_id
  const generationIdParam = searchParams.get('generation_id');
  if (generationIdParam) {
    const generationId = parseInt(generationIdParam, 10);
    if (isNaN(generationId) || generationId < 1) {
      throw new ValidationError('generation_id', 'invalid', {
        message: 'Generation ID must be a positive integer'
      });
    }
    query.generation_id = generationId;
  }

  return query;
}
```

#### SQL Injection Prevention
- Use Supabase client query builder (parameterized queries)
- Never concatenate user input into SQL strings
- Supabase client handles escaping automatically

### Rate Limiting
- **Limit**: 100 requests per minute per user
- **Implementation**: Middleware with in-memory store or Redis
- **Headers**: Include rate limit info in all responses
- **Scope**: Per user_id from authenticated token

### CORS Configuration
```typescript
response.headers.set('Access-Control-Allow-Origin', import.meta.env.PUBLIC_FRONTEND_URL);
response.headers.set('Access-Control-Allow-Methods', 'GET');
response.headers.set('Access-Control-Allow-Headers', 'Authorization');
```

## 7. Error Handling

### Error Scenarios

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid limit (> 100) | 400 | VALIDATION_ERROR | Limit must not exceed 100 |
| Invalid limit (< 1) | 400 | VALIDATION_ERROR | Limit must be a positive integer |
| Invalid limit (not int) | 400 | VALIDATION_ERROR | Limit must be a positive integer |
| Invalid cursor (not int) | 400 | VALIDATION_ERROR | Cursor must be a positive integer |
| Invalid cursor (< 1) | 400 | VALIDATION_ERROR | Cursor must be a positive integer |
| Invalid source value | 400 | VALIDATION_ERROR | Source must be one of: ai-full, ai-edited, manual |
| Invalid generation_id | 400 | VALIDATION_ERROR | Generation ID must be a positive integer |
| Missing auth header | 401 | UNAUTHORIZED | Missing authorization header |
| Invalid JWT token | 401 | UNAUTHORIZED | Invalid or malformed authentication token |
| Expired JWT token | 401 | UNAUTHORIZED | Authentication token has expired |
| Rate limit exceeded | 429 | RATE_LIMIT_EXCEEDED | Rate limit exceeded. Maximum 100 requests per minute allowed |
| Database connection error | 500 | INTERNAL_ERROR | Database connection failed |
| Unknown database error | 500 | INTERNAL_ERROR | An unexpected error occurred while retrieving flashcards |

### Error Response Builder
```typescript
function buildErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details
    }
  };
}
```

### Try-Catch Implementation
```typescript
try {
  // Validate query parameters
  const query = validateListFlashcardsQuery(
    new URL(request.url).searchParams
  );

  // Get user context from middleware
  const userId = locals.userId as string;
  const accessToken = locals.accessToken as string;

  // Service call
  const flashcardService = new FlashcardService(accessToken);
  const response = await flashcardService.listUserFlashcards(query, userId);

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

} catch (error) {
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify(buildErrorResponse(
        'VALIDATION_ERROR',
        error.message,
        error.details
      )),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof AuthenticationError) {
    return new Response(
      JSON.stringify(buildErrorResponse(
        'UNAUTHORIZED',
        error.message
      )),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof RateLimitError) {
    return new Response(
      JSON.stringify(buildErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Maximum 100 requests per minute allowed'
      )),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Reset': Math.floor(error.resetTime / 1000).toString()
        }
      }
    );
  }

  // Log unexpected errors
  console.error('Unexpected error in GET /api/flashcards:', error);

  return new Response(
    JSON.stringify(buildErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while retrieving flashcards'
    )),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## 8. Performance Considerations

### Database Performance

#### Indexes Used
- `user_id` index on flashcards table (for RLS policy)
- `generation_id` index (for generation_id filter)
- `source` index (consider adding for better filter performance)
- Primary key `id` index (for ordering and cursor pagination)

#### Query Optimization
- Use cursor-based pagination (more efficient than offset)
- Limit query to fetch only needed columns (use SELECT *)
- Leverage database indexes for filtering
- Fetch limit + 1 records to determine has_more efficiently

#### Index Recommendation
```sql
-- Add index on source for better filter performance
CREATE INDEX idx_flashcards_source ON flashcards(source);

-- Composite index for common query pattern
CREATE INDEX idx_flashcards_user_id_source_id
  ON flashcards(user_id, source, id DESC);
```

### Caching Strategy

#### Response Caching
```typescript
// Cache-Control header for client-side caching
response.headers.set('Cache-Control', 'private, max-age=30');
```

#### Server-Side Caching
```typescript
// Use Redis for caching common queries
const cacheKey = `flashcards:${userId}:${JSON.stringify(query)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await fetchFromDatabase();
await redis.setex(cacheKey, 60, JSON.stringify(result)); // 60s TTL

return result;
```

#### Cache Invalidation
- Invalidate cache when flashcards are created, updated, or deleted
- Use cache tags or pattern matching for efficient invalidation

### Pagination Performance

#### Cursor-Based Advantages
- Consistent results even when data changes
- No deep offset penalty (no need to skip rows)
- O(1) lookup using index on id

#### Limit Recommendations
- Default: 50 items (balance between data transfer and UX)
- Maximum: 100 items (prevent excessive memory usage)
- Frontend should implement infinite scroll

### Payload Size Optimization
- Typical response size: ~50 flashcards × 1KB = ~50KB
- Use gzip compression in production
- Consider field selection if payload grows

### Connection Pooling
- Supabase client handles connection pooling
- Use singleton pattern for client instance
- Reuse client across requests

### Monitoring Metrics
- Track average response time (target: < 100ms)
- Monitor query execution time
- Track cache hit rate
- Monitor pagination patterns (average page size)
- Alert on error rate > 5%
- Track most common filter combinations

## 9. Implementation Steps

### Step 1: Create Query Validation Utilities
**File**: `src/lib/validation/query-validation.ts`

```typescript
import {
  ListFlashcardsQuery,
  PaginationConstraints,
  isFlashcardSource
} from '@/types';
import { ValidationError } from './flashcard-validation';

export function validateListFlashcardsQuery(
  searchParams: URLSearchParams
): ListFlashcardsQuery {
  const query: ListFlashcardsQuery = {};

  // Validate and parse limit
  const limitParam = searchParams.get('limit');
  if (limitParam) {
    const limit = parseInt(limitParam, 10);

    if (isNaN(limit)) {
      throw new ValidationError('limit', 'type', {
        message: 'Limit must be an integer'
      });
    }

    if (limit < 1) {
      throw new ValidationError('limit', 'range', {
        message: 'Limit must be at least 1',
        min: 1,
        actual: limit
      });
    }

    if (limit > PaginationConstraints.FLASHCARDS_MAX_LIMIT) {
      throw new ValidationError('limit', 'range', {
        message: `Limit must not exceed ${PaginationConstraints.FLASHCARDS_MAX_LIMIT}`,
        max: PaginationConstraints.FLASHCARDS_MAX_LIMIT,
        actual: limit
      });
    }

    query.limit = limit;
  } else {
    query.limit = PaginationConstraints.FLASHCARDS_DEFAULT_LIMIT;
  }

  // Validate and parse cursor
  const cursorParam = searchParams.get('cursor');
  if (cursorParam) {
    const cursor = parseInt(cursorParam, 10);

    if (isNaN(cursor)) {
      throw new ValidationError('cursor', 'type', {
        message: 'Cursor must be an integer'
      });
    }

    if (cursor < 1) {
      throw new ValidationError('cursor', 'range', {
        message: 'Cursor must be a positive integer',
        min: 1,
        actual: cursor
      });
    }

    query.cursor = cursor;
  }

  // Validate source
  const sourceParam = searchParams.get('source');
  if (sourceParam) {
    if (!isFlashcardSource(sourceParam)) {
      throw new ValidationError('source', 'enum', {
        message: 'Source must be one of: ai-full, ai-edited, manual',
        allowed: ['ai-full', 'ai-edited', 'manual'],
        actual: sourceParam
      });
    }
    query.source = sourceParam;
  }

  // Validate generation_id
  const generationIdParam = searchParams.get('generation_id');
  if (generationIdParam) {
    const generationId = parseInt(generationIdParam, 10);

    if (isNaN(generationId)) {
      throw new ValidationError('generation_id', 'type', {
        message: 'Generation ID must be an integer'
      });
    }

    if (generationId < 1) {
      throw new ValidationError('generation_id', 'range', {
        message: 'Generation ID must be a positive integer',
        min: 1,
        actual: generationId
      });
    }

    query.generation_id = generationId;
  }

  return query;
}
```

### Step 2: Update Flashcard Service
**File**: `src/services/flashcard-service.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import type {
  ListFlashcardsQuery,
  ListFlashcardsResponse,
  FlashcardDTO,
  PaginationMeta
} from '@/types';

export class FlashcardService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(accessToken: string) {
    this.supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );
  }

  async listUserFlashcards(
    query: ListFlashcardsQuery,
    userId: string
  ): Promise<ListFlashcardsResponse> {
    const limit = query.limit!; // Already validated with default

    // Build query
    let dbQuery = this.supabase
      .from('flashcards')
      .select('*')
      .order('id', { ascending: false });

    // Apply filters
    if (query.source) {
      dbQuery = dbQuery.eq('source', query.source);
    }

    if (query.generation_id) {
      dbQuery = dbQuery.eq('generation_id', query.generation_id);
    }

    if (query.cursor) {
      dbQuery = dbQuery.lt('id', query.cursor);
    }

    // Fetch limit + 1 to determine has_more
    dbQuery = dbQuery.limit(limit + 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error listing flashcards:', error);
      throw new Error('Failed to retrieve flashcards');
    }

    // Process pagination
    const hasMore = data.length > limit;
    const flashcards = hasMore ? data.slice(0, limit) : data;

    const pagination: PaginationMeta = {
      has_more: hasMore
    };

    if (hasMore && flashcards.length > 0) {
      pagination.next_cursor = flashcards[flashcards.length - 1].id;
    }

    return {
      data: flashcards as FlashcardDTO[],
      pagination
    };
  }

  // ... other methods (createManualFlashcard, etc.)
}
```

### Step 3: Create GET Endpoint
**File**: `src/pages/api/flashcards.ts`

```typescript
import type { APIRoute } from 'astro';
import { validateListFlashcardsQuery } from '@/lib/validation/query-validation';
import { ValidationError } from '@/lib/validation/flashcard-validation';
import { FlashcardService } from '@/services/flashcard-service';
import { AuthenticationError } from '@/middleware/auth';
import { RateLimitError } from '@/middleware/rate-limit';
import type { ApiErrorResponse } from '@/types';

function buildErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    error: {
      code: code as any,
      message,
      details
    }
  };
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = validateListFlashcardsQuery(url.searchParams);

    // Get user context from middleware
    const userId = locals.userId as string;
    const accessToken = locals.accessToken as string;

    // List flashcards
    const flashcardService = new FlashcardService(accessToken);
    const response = await flashcardService.listUserFlashcards(query, userId);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=30'
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify(buildErrorResponse(
          'VALIDATION_ERROR',
          error.message,
          error.details
        )),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle authentication errors
    if (error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify(buildErrorResponse(
          'UNAUTHORIZED',
          error.message
        )),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify(buildErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Rate limit exceeded. Maximum 100 requests per minute allowed'
        )),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Reset': Math.floor(error.resetTime / 1000).toString()
          }
        }
      );
    }

    // Log unexpected errors
    console.error('Unexpected error in GET /api/flashcards:', error);

    return new Response(
      JSON.stringify(buildErrorResponse(
        'INTERNAL_ERROR',
        'An unexpected error occurred while retrieving flashcards'
      )),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// POST method from previous implementation...
```

### Step 4: Create Unit Tests
**File**: `src/lib/validation/__tests__/query-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateListFlashcardsQuery } from '../query-validation';
import { ValidationError } from '../flashcard-validation';
import { PaginationConstraints } from '@/types';

describe('validateListFlashcardsQuery', () => {
  it('should use default limit when not provided', () => {
    const params = new URLSearchParams();
    const query = validateListFlashcardsQuery(params);

    expect(query.limit).toBe(PaginationConstraints.FLASHCARDS_DEFAULT_LIMIT);
  });

  it('should validate limit correctly', () => {
    const params = new URLSearchParams({ limit: '20' });
    const query = validateListFlashcardsQuery(params);

    expect(query.limit).toBe(20);
  });

  it('should throw error for limit exceeding max', () => {
    const params = new URLSearchParams({ limit: '150' });

    expect(() => validateListFlashcardsQuery(params))
      .toThrow(ValidationError);
  });

  it('should validate cursor correctly', () => {
    const params = new URLSearchParams({ cursor: '100' });
    const query = validateListFlashcardsQuery(params);

    expect(query.cursor).toBe(100);
  });

  it('should throw error for invalid source', () => {
    const params = new URLSearchParams({ source: 'invalid' });

    expect(() => validateListFlashcardsQuery(params))
      .toThrow(ValidationError);
  });

  it('should validate source correctly', () => {
    const params = new URLSearchParams({ source: 'ai-full' });
    const query = validateListFlashcardsQuery(params);

    expect(query.source).toBe('ai-full');
  });

  it('should validate generation_id correctly', () => {
    const params = new URLSearchParams({ generation_id: '45' });
    const query = validateListFlashcardsQuery(params);

    expect(query.generation_id).toBe(45);
  });

  it('should handle multiple filters', () => {
    const params = new URLSearchParams({
      limit: '30',
      cursor: '200',
      source: 'manual'
    });
    const query = validateListFlashcardsQuery(params);

    expect(query.limit).toBe(30);
    expect(query.cursor).toBe(200);
    expect(query.source).toBe('manual');
  });
});
```

### Step 5: Integration Tests
**File**: `tests/api/flashcards-list.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('GET /api/flashcards', () => {
  let accessToken: string;

  beforeAll(async () => {
    // Authenticate test user
    const authResponse = await fetch('http://localhost:4321/auth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });

    const authData = await authResponse.json();
    accessToken = authData.access_token;

    // Create some test flashcards
    for (let i = 0; i < 5; i++) {
      await fetch('http://localhost:4321/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          front: `Question ${i}`,
          back: `Answer ${i}`
        })
      });
    }
  });

  it('should list flashcards with default pagination', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).toBeInstanceOf(Array);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.has_more).toBeDefined();
  });

  it('should respect limit parameter', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards?limit=2', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.length).toBeLessThanOrEqual(2);
  });

  it('should filter by source', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards?source=manual', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    data.data.forEach((flashcard: any) => {
      expect(flashcard.source).toBe('manual');
    });
  });

  it('should handle pagination with cursor', async () => {
    const firstResponse = await fetch('http://localhost:4321/api/flashcards?limit=2', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const firstData = await firstResponse.json();

    if (firstData.pagination.has_more) {
      const cursor = firstData.pagination.next_cursor;

      const secondResponse = await fetch(
        `http://localhost:4321/api/flashcards?limit=2&cursor=${cursor}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      expect(secondResponse.status).toBe(200);

      const secondData = await secondResponse.json();
      expect(secondData.data[0].id).toBeLessThan(cursor);
    }
  });

  it('should return 401 without auth token', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards');

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid limit', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards?limit=200', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid source', async () => {
    const response = await fetch('http://localhost:4321/api/flashcards?source=invalid', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Step 6: Add Response Caching (Optional)
**File**: `src/services/cache-service.ts`

```typescript
import { createClient } from 'redis';

class CacheService {
  private client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      url: import.meta.env.REDIS_URL
    });
    this.client.connect();
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 60): Promise<void> {
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}

export const cacheService = new CacheService();
```

### Step 7: Database Index Optimization
**File**: `supabase/migrations/002_add_flashcards_indexes.sql`

```sql
-- Index on source for filtering
CREATE INDEX IF NOT EXISTS idx_flashcards_source
  ON flashcards(source);

-- Composite index for common query pattern (user + filters + ordering)
CREATE INDEX IF NOT EXISTS idx_flashcards_user_source_id
  ON flashcards(user_id, source, id DESC);

-- Index for generation_id filtering
-- (Already exists from initial schema, but included for completeness)
CREATE INDEX IF NOT EXISTS idx_flashcards_generation_id
  ON flashcards(generation_id);
```

### Step 8: Add Monitoring
**File**: `src/lib/monitoring/metrics.ts`

```typescript
import type { ListFlashcardsQuery } from '@/types';

export function trackListFlashcardsRequest(
  userId: string,
  query: ListFlashcardsQuery,
  duration: number,
  resultCount: number
): void {
  // Log to monitoring service (e.g., DataDog, New Relic)
  console.log('[METRICS]', {
    endpoint: 'GET /api/flashcards',
    userId,
    query,
    duration,
    resultCount,
    timestamp: new Date().toISOString()
  });
}
```

### Step 9: Update Documentation
- Document query parameters and their validation rules
- Add pagination examples with cursor usage
- Document filter combinations
- Add performance considerations
- Document cache behavior (if implemented)

### Step 10: Deploy and Monitor
- Deploy database indexes
- Configure Redis (if using caching)
- Set up monitoring alerts
- Monitor query performance
- Track common filter patterns for optimization

## 10. Testing Checklist

- [ ] Unit tests for query validation
- [ ] Unit tests for service methods
- [ ] Test default pagination (no parameters)
- [ ] Test custom limit parameter
- [ ] Test cursor pagination (multiple pages)
- [ ] Test source filter (each value: manual, ai-full, ai-edited)
- [ ] Test generation_id filter
- [ ] Test combined filters (source + generation_id)
- [ ] Test limit boundary (1, 50, 100)
- [ ] Test invalid limit (0, -1, 101, 'abc')
- [ ] Test invalid cursor ('abc', -1)
- [ ] Test invalid source ('invalid')
- [ ] Test authentication with valid token
- [ ] Test authentication with invalid token
- [ ] Test RLS enforcement (can't see other users' flashcards)
- [ ] Test rate limiting
- [ ] Test ordering (newest first)
- [ ] Test has_more flag accuracy
- [ ] Test next_cursor value correctness
- [ ] Test empty result set
- [ ] Load testing (target: 100 req/s)
- [ ] Monitor response times (target: < 100ms)

## 11. Deployment Considerations

### Database Indexes
Ensure all performance indexes are created:
```sql
-- Run migration
supabase migration up
```

### Caching Configuration
If using Redis:
- Set `REDIS_URL` environment variable
- Configure TTL based on data freshness requirements
- Implement cache invalidation on create/update/delete

### Monitoring
- Set up query performance monitoring
- Track pagination usage patterns
- Monitor cache hit rates
- Alert on slow queries (> 200ms)
- Track most common filter combinations

### Performance Targets
- p50 response time: < 50ms
- p95 response time: < 100ms
- p99 response time: < 200ms
- Throughput: > 100 req/s per instance

### Frontend Integration
Provide usage examples for:
- Initial load
- Infinite scroll implementation
- Filter application
- Cache management
