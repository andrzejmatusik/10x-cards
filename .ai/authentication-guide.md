# Przewodnik uwierzytelniania - 10x Cards

## Status middleware

✅ **Authentication middleware zaimplementowane**

Middleware sprawdza tokeny JWT dla wszystkich requestów do `/api/*` i automatycznie obsługuje tryb developerski.

## Tryby działania

### 1. Tryb produkcyjny

W produkcji wszystkie requesty do API **wymagają** tokenu JWT:

```bash
# Request z tokenem
curl -X POST http://localhost:3000/api/generations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_text": "..."", "model": "openai/gpt-4"}'
```

Bez tokenu:
```
401 Unauthorized: Missing authorization header
```

### 2. Tryb deweloperski (DEV)

W trybie dev (`npm run dev`) middleware **automatycznie** używa mock userId gdy brak tokenu:

```typescript
// Automatycznie ustawiane w dev mode:
context.locals.userId = "mock-user-id-dev-mode";
context.locals.userEmail = "dev@example.com";
```

**Możesz testować API bez tokenu:**

```bash
# Request bez tokenu - działa w dev mode!
curl -X POST http://localhost:3000/api/generations \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Spaced repetition jest techniką uczenia się...",
    "model": "openai/gpt-4"
  }'
```

## Konfiguracja middleware

**Lokalizacja:** `src/middleware/auth.ts`

```typescript
export const authMiddleware: MiddlewareHandler = async (context, next) => {
  // Only apply to API routes
  if (!context.url.pathname.startsWith("/api")) {
    return next();
  }

  const authHeader = context.request.headers.get("Authorization");
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";

  // Dev mode: Allow without token
  if (!authHeader && isDevelopment) {
    context.locals.userId = "mock-user-id-dev-mode";
    context.locals.userEmail = "dev@example.com";
    return next();
  }

  // Production: Require token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing authorization header");
  }

  // Verify JWT with Supabase...
};
```

## Jak uzyskać token JWT (dla produkcji)

### 1. Rejestracja użytkownika

```bash
curl -X POST https://your-supabase-url/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "user": { "id": "uuid-here", ... }
}
```

### 2. Logowanie

```bash
curl -X POST https://your-supabase-url/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 3. Użycie tokenu w requestach

```bash
curl -X POST http://localhost:3000/api/generations \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"source_text": "...", "model": "openai/gpt-4"}'
```

## Frontend: API Client

API client (`src/services/api/client.ts`) automatycznie dodaje token z localStorage:

```typescript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Zapisywanie tokenu po logowaniu

```typescript
// Po sukcesie logowania:
const response = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123"
});

if (response.data.session) {
  // Zapisz token do localStorage
  localStorage.setItem("access_token", response.data.session.access_token);

  // Teraz wszystkie requesty API będą miały token
}
```

## Testowanie endpointów w dev mode

### Test generowania fiszek

```bash
curl -X POST http://localhost:3000/api/generations \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "'"$(printf 'a%.0s' {1..1500})"'",
    "model": "openai/gpt-4"
  }'
```

### Test zapisu batch fiszek

```bash
curl -X POST http://localhost:3000/api/flashcards/batch \
  -H "Content-Type: application/json" \
  -d '{
    "generation_id": 123,
    "flashcards": [
      {
        "front": "Pytanie testowe?",
        "back": "Odpowiedź testowa.",
        "source": "ai-full"
      }
    ]
  }'
```

## Wyłączenie trybu dev (wymuszenie produkcji)

Jeśli chcesz przetestować prawdziwą autentykację w dev:

1. Ustaw zmienną środowiskową:
```bash
export NODE_ENV=production
npm run dev
```

2. Lub zmodyfikuj warunek w middleware:
```typescript
const isDevelopment = false; // Wymuś produkcję
```

## Błędy i ich obsługa

### Missing authorization header (production)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing authorization header"
  }
}
```
**Rozwiązanie:** Dodaj header `Authorization: Bearer <token>`

### Invalid or expired token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```
**Rozwiązanie:**
- Uzyskaj nowy token przez logowanie
- Sprawdź czy token nie wygasł (expires_in: 3600s)
- Użyj refresh token do odnowienia

### Token w dev mode (debugging)

W trybie dev możesz sprawdzić jaki userId jest ustawiony:

```typescript
// W endpointcie API
console.log("User ID:", locals.userId); // "mock-user-id-dev-mode"
```

## Następne kroki

TODO dla pełnej implementacji auth:

1. ✅ Middleware uwierzytelniania
2. ✅ Tryb dev z mock userId
3. ⚠️ Strony logowania/rejestracji (`/login`, `/register`)
4. ⚠️ Obsługa sesji w localStorage
5. ⚠️ Refresh token mechanism
6. ⚠️ Protected routes w Astro (redirect do /login)
7. ⚠️ Wylogowanie i czyszczenie tokenu

## Bezpieczeństwo

**WAŻNE:** W produkcji:

1. Nigdy nie commituj tokenów do repozytorium
2. Używaj HTTPS dla wszystkich requestów
3. Implementuj rate limiting (już jest w middleware)
4. Sprawdzaj wygaśnięcie tokenów
5. Używaj refresh tokenów dla długich sesji
6. Wyłącz tryb dev w produkcji (automatyczne przez NODE_ENV)

## Przykład pełnego flow

```typescript
// 1. Logowanie (frontend)
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123"
});

if (data.session) {
  localStorage.setItem("access_token", data.session.access_token);
}

// 2. Request do API (automatyczny token)
const response = await generateFlashcards({
  source_text: "...",
  model: "openai/gpt-4"
});
// API client automatycznie doda: Authorization: Bearer <token>

// 3. Backend (middleware)
// - Sprawdza token
// - Weryfikuje z Supabase
// - Ustawia context.locals.userId
// - Endpoint używa userId do zapisu w bazie
```

## Debugging

### Sprawdzenie czy token jest wysyłany

```typescript
// W API client
apiClient.interceptors.request.use((config) => {
  console.log("Request headers:", config.headers);
  return config;
});
```

### Sprawdzenie userId w endpoint

```typescript
// W endpoint (np. generations.ts)
export const POST: APIRoute = async ({ locals }) => {
  console.log("Authenticated user ID:", locals.userId);
  console.log("User email:", locals.userEmail);
  // ...
};
```

### Logowanie middleware

Dodaj logi w `src/middleware/auth.ts`:

```typescript
export const authMiddleware: MiddlewareHandler = async (context, next) => {
  console.log("Auth middleware - path:", context.url.pathname);
  console.log("Auth header present:", !!context.request.headers.get("Authorization"));
  console.log("Is dev mode:", import.meta.env.DEV);
  // ...
};
```
