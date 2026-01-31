# Specyfikacja Techniczna: Moduł Autentykacji
# 10x-cards - System Rejestracji, Logowania i Odzyskiwania Hasła

**Wersja:** 1.0
**Data:** 2026-01-31
**Status:** Gotowa do implementacji

---

## 1. WPROWADZENIE

### 1.1. Cel dokumentu
Niniejsza specyfikacja techniczna definiuje architekturę i szczegóły implementacji modułu autentykacji dla aplikacji 10x-cards, realizującego wymagania US-001 (Rejestracja konta) i US-002 (Logowanie do aplikacji) z dokumentu PRD.

### 1.2. Zakres funkcjonalny
Moduł obejmuje:
- Rejestrację nowych użytkowników z natychmiastowym logowaniem (auto-login)
- Logowanie użytkowników z obsługą sesji
- Odzyskiwanie hasła przez email (reset password)
- Zarządzanie sesją użytkownika (token JWT w localStorage + cookies)
- Ochronę routes wymagających autentykacji
- Wylogowanie i czyszczenie sesji

**Uwaga MVP:** Email verification jest **wyłączona** dla uproszczenia procesu rejestracji zgodnie z US-001. Użytkownik zostaje automatycznie zalogowany po rejestracji bez konieczności potwierdzania adresu email.

### 1.3. Obecny stan implementacji
**Zaimplementowane:**
- ✅ Middleware uwierzytelniania dla API routes (`src/middleware/auth.ts`)
- ✅ RLS policies w bazie danych dla tabeli `auth.users` (zarządzane przez Supabase)
- ✅ UI komponentu AuthPanel z formularzami logowania, rejestracji i odzyskiwania hasła
- ✅ API client z automatycznym dołączaniem tokena JWT z localStorage
- ✅ Interceptor w API client przekierowujący na `/login` przy 401

**Do zaimplementowania:**
- ⚠️ Logika autentykacji w komponentach React
- ⚠️ Server-side authentication checks w stronach Astro
- ⚠️ Routing dla stron autentykacji
- ⚠️ Serwis zarządzania sesją
- ⚠️ Nawigacja z menu użytkownika
- ⚠️ Obsługa password reset flow
- ⚠️ Protected routes middleware dla stron (nie tylko API)

---

## 2. ARCHITEKTURA SYSTEMU

### 2.1. Diagram przepływu autentykacji

```
┌─────────────────────────────────────────────────────────────────┐
│                    WARSTWA PREZENTACJI (CLIENT)                  │
├─────────────────────────────────────────────────────────────────┤
│  Astro Pages (SSR)          │  React Components (Client)         │
│  - /login                   │  - AuthPanel.tsx                   │
│  - /register                │  - UserMenu.tsx                    │
│  - /forgot-password         │  - ProtectedRoute.tsx              │
│  - /reset-password          │                                    │
│  - /generate (protected)    │                                    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WARSTWA SERWISÓW (CLIENT)                      │
├─────────────────────────────────────────────────────────────────┤
│  - AuthService (src/services/auth-service.ts)                   │
│    - signUp()                                                    │
│    - signIn()                                                    │
│    - signOut()                                                   │
│    - resetPassword()                                             │
│    - updatePassword()                                            │
│    - getSession()                                                │
│    - refreshSession()                                            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WARSTWA MIDDLEWARE (SERVER)                   │
├─────────────────────────────────────────────────────────────────┤
│  - supabaseMiddleware (inject client)                           │
│  - authMiddleware (verify JWT for /api/*)                       │
│  - pageAuthMiddleware (verify session for protected pages)      │
│  - rateLimitMiddleware                                           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WARSTWA DANYCH (SUPABASE)                       │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Auth                │  PostgreSQL Database             │
│  - auth.users                 │  - generations                   │
│  - JWT generation             │  - flashcards                    │
│  - Email verification         │  - generation_error_logs         │
│  - Password reset             │  (wszystkie z user_id FK)        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Podział odpowiedzialności

#### 2.2.1. Astro Pages (Server-Side Rendering)
**Odpowiedzialność:**
- Rendering początkowego HTML
- Server-side validation sesji
- Przekierowania (redirect) dla niezalogowanych użytkowników
- Przekazanie danych sesji do komponentów React przez props

**Strony:**
- `src/pages/index.astro` - landing page z AuthPanel
- `src/pages/login.astro` - dedykowana strona logowania (opcjonalna)
- `src/pages/register.astro` - dedykowana strona rejestracji (opcjonalna)
- `src/pages/forgot-password.astro` - strona odzyskiwania hasła
- `src/pages/reset-password.astro` - strona resetowania hasła (z tokenem w URL)
- `src/pages/generate.astro` - chroniona strona generowania (wymaga auth)
- `src/pages/dashboard.astro` - chroniona strona dashboard (przyszłość)

#### 2.2.2. React Components (Client-Side)
**Odpowiedzialność:**
- Interaktywne formularze
- Client-side validation
- Wywołania AuthService
- Zarządzanie stanem UI (loading, errors)
- Feedback dla użytkownika (toasts, error messages)

**Komponenty:**
- `AuthPanel.tsx` - główny panel autentykacji (logowanie/rejestracja/forgot password)
- `UserMenu.tsx` - menu użytkownika w nawigacji (avatar, email, wylogowanie)
- `SessionProvider.tsx` - context provider dla sesji użytkownika
- `ProtectedContent.tsx` - wrapper dla treści wymagających autentykacji

#### 2.2.3. Middleware (Server-Side)
**Odpowiedzialność:**
- Weryfikacja tokenów JWT
- Injekcja Supabase client do context.locals
- Ochrona routes API i stron
- Rate limiting
- Obsługa błędów autentykacji

**Moduły:**
- `src/middleware/auth.ts` - weryfikacja JWT dla `/api/*` (już istnieje)
- `src/middleware/page-auth.ts` - weryfikacja sesji dla chronionych stron (nowy)
- `src/middleware/index.ts` - kompozycja middleware pipeline

---

## 3. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 3.1. Routing i nawigacja

#### 3.1.1. Mapa stron aplikacji

```
/ (index.astro)
├── AuthPanel - dla niezalogowanych
└── Redirect → /generate - dla zalogowanych

/generate (protected)
├── Wymaga: authenticated session
├── Redirect → /login?redirect=/generate - dla niezalogowanych
└── Zawiera: GenerateFlashcardsView + UserMenu

/login (opcjonalna dedykowana strona)
├── Query param: ?redirect=/original-path
├── AuthPanel z mode="login"
└── Po logowaniu → redirect do original-path lub /generate

/register (opcjonalna dedykowana strona)
├── AuthPanel z mode="register"
└── Po rejestracji → /verify-email lub auto-login → /generate

/forgot-password
├── Formularz z email input
└── Po wysłaniu → /check-email

/reset-password
├── Query param: ?token=... (z email link)
├── Formularz z nowym hasłem
└── Po zmianie → /login z success message

/auth/callback (opcjonalny - dla przyszłych rozszerzeń)
├── Obsługuje callback z Supabase (password reset, social auth)
└── Redirect → /generate lub /reset-password
```

#### 3.1.2. Struktura nawigacji

**Dla niezalogowanych użytkowników:**
```
┌────────────────────────────────────────────┐
│  10x-cards                    [Theme Toggle]│
│                                             │
│  [Główna] [O aplikacji] [Zaloguj się]      │
└────────────────────────────────────────────┘
```

**Dla zalogowanych użytkowników:**
```
┌─────────────────────────────────────────────────────┐
│  10x-cards                [Avatar ▼]  [Theme Toggle] │
│                           └─ Moje konto             │
│  [Generuj] [Moje fiszki]    ├─ Ustawienia          │
│                             └─ Wyloguj              │
└─────────────────────────────────────────────────────┘
```

### 3.2. Komponenty UI i ich odpowiedzialności

#### 3.2.1. AuthPanel.tsx (rozszerzenie istniejącego)

**Lokalizacja:** `src/components/auth/AuthPanel.tsx`

**Props:**
```typescript
interface AuthPanelProps {
  mode?: 'login' | 'register' | 'forgot-password';
  redirectTo?: string;
  onSuccess?: (user: User) => void;
}
```

**Odpowiedzialności:**
- Renderowanie formularzy logowania, rejestracji i odzyskiwania hasła
- Client-side validation (email format, password strength)
- Wywoływanie AuthService dla operacji auth
- Wyświetlanie błędów i success messages
- Przełączanie między trybami (login ↔ register ↔ forgot-password)

**Stany komponentu:**
```typescript
interface AuthPanelState {
  mode: 'login' | 'register' | 'forgot-password';
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  formData: {
    email: string;
    password: string;
    confirmPassword?: string;
  };
}
```

**Walidacja client-side:**
- Email: regex validation + format check
- Hasło (rejestracja):
  - Min. 8 znaków
  - Zawiera wielką literę
  - Zawiera małą literę
  - Zawiera cyfrę
  - Zawiera znak specjalny (opcjonalnie)
- Potwierdzenie hasła: match z password

**Komunikaty błędów:**
```typescript
const ERROR_MESSAGES = {
  'auth/invalid-email': 'Nieprawidłowy format adresu email',
  'auth/user-not-found': 'Użytkownik o podanym adresie email nie istnieje',
  'auth/wrong-password': 'Nieprawidłowe hasło',
  'auth/email-already-in-use': 'Konto z tym adresem email już istnieje',
  'auth/weak-password': 'Hasło jest zbyt słabe. Użyj min. 8 znaków',
  'auth/too-many-requests': 'Zbyt wiele prób logowania. Spróbuj ponownie później',
  'network-error': 'Błąd połączenia. Sprawdź połączenie internetowe',
  'generic': 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie',
};
```

**Integracja z AuthService:**
```typescript
// Logowanie
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    const { user, session } = await AuthService.signIn(
      formData.email,
      formData.password
    );

    // Zapisz session do localStorage (AuthService robi to automatycznie)
    // Przekieruj użytkownika
    window.location.href = redirectTo || '/generate';
  } catch (error) {
    setError(translateError(error));
  } finally {
    setIsLoading(false);
  }
};

// Rejestracja
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();

  // Client-side validation
  if (!validatePassword(formData.password)) {
    setError('Hasło nie spełnia wymagań');
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    setError('Hasła nie są identyczne');
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const { user } = await AuthService.signUp(
      formData.email,
      formData.password
    );

    // Sprawdź czy wymaga email verification
    if (user.emailConfirmed) {
      // Auto-login
      window.location.href = '/generate';
    } else {
      // Przekieruj do verify-email page
      window.location.href = '/verify-email';
    }
  } catch (error) {
    setError(translateError(error));
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.2.2. UserMenu.tsx (nowy komponent)

**Lokalizacja:** `src/components/auth/UserMenu.tsx`

**Props:**
```typescript
interface UserMenuProps {
  user: {
    id: string;
    email: string;
    avatarUrl?: string;
  };
}
```

**Odpowiedzialności:**
- Wyświetlanie avatara użytkownika i email
- Dropdown menu z opcjami:
  - Moje konto
  - Ustawienia
  - Wyloguj
- Obsługa wylogowania (wywołanie AuthService.signOut)

**Implementacja dropdown:**
```typescript
export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await AuthService.signOut();
    window.location.href = '/';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>{user.email[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">Zalogowany jako</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => window.location.href = '/account'}>
          <User className="mr-2 h-4 w-4" />
          Moje konto
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
          <Settings className="mr-2 h-4 w-4" />
          Ustawienia
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3.2.3. SessionProvider.tsx (nowy komponent)

**Lokalizacja:** `src/components/auth/SessionProvider.tsx`

**Odpowiedzialności:**
- Udostępnianie kontekstu sesji dla komponentów React
- Nasłuchiwanie zmian sesji (login, logout, token refresh)
- Automatyczne odświeżanie tokena przed wygaśnięciem

**Implementacja:**
```typescript
interface SessionContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);

        if (event === 'SIGNED_OUT') {
          // Clear local storage
          localStorage.removeItem('access_token');
          window.location.href = '/';
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!session) return;

    const expiresAt = session.expires_at * 1000;
    const refreshAt = expiresAt - 5 * 60 * 1000; // 5 min before expiry
    const timeout = refreshAt - Date.now();

    if (timeout > 0) {
      const timer = setTimeout(async () => {
        await refreshSession();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [session]);

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (data.session) {
      setSession(data.session);
      localStorage.setItem('access_token', data.session.access_token);
    }
  };

  const signOut = async () => {
    await AuthService.signOut();
  };

  return (
    <SessionContext.Provider value={{ user, session, isLoading, signOut, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
```

#### 3.2.4. Navigation.astro (nowy komponent)

**Lokalizacja:** `src/components/Navigation.astro`

**Odpowiedzialności:**
- Renderowanie głównej nawigacji aplikacji
- Warunkowe wyświetlanie elementów dla zalogowanych/niezalogowanych
- Integracja z UserMenu dla zalogowanych użytkowników

**Implementacja:**
```astro
---
import { UserMenu } from './auth/UserMenu';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  user?: {
    id: string;
    email: string;
  } | null;
}

const { user } = Astro.props;
---

<nav class="border-b bg-background">
  <div class="container mx-auto px-4 py-3 flex items-center justify-between">
    <div class="flex items-center space-x-8">
      <a href="/" class="text-2xl font-bold">10x-cards</a>

      {user && (
        <div class="hidden md:flex space-x-4">
          <a href="/generate" class="text-muted-foreground hover:text-foreground">
            Generuj
          </a>
          <a href="/flashcards" class="text-muted-foreground hover:text-foreground">
            Moje fiszki
          </a>
        </div>
      )}
    </div>

    <div class="flex items-center space-x-4">
      <ThemeToggle client:load />

      {user ? (
        <UserMenu user={user} client:load />
      ) : (
        <a
          href="/login"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Zaloguj się
        </a>
      )}
    </div>
  </div>
</nav>
```

### 3.3. Aktualizacja Layout.astro

**Rozszerzenie:** `src/layouts/Layout.astro`

**Zmiany:**
- Dodanie Navigation component
- Przekazanie informacji o sesji użytkownika

```astro
---
import '../styles/global.css';
import ThemeScript from '@/components/ThemeScript.astro';
import Navigation from '@/components/Navigation.astro';

interface Props {
  title?: string;
  user?: {
    id: string;
    email: string;
  } | null;
}

const { title = '10x-cards', user = null } = Astro.props;
---

<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <ThemeScript />
  </head>
  <body>
    <Navigation user={user} />
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </body>
</html>
```

### 3.4. Scenariusze użycia i przepływy UI

#### 3.4.1. Scenariusz: Rejestracja nowego użytkownika

**Kroki:**
1. Użytkownik wchodzi na `/` (index.astro)
2. Widzi AuthPanel w trybie `login`
3. Klika "Utwórz nowe konto" → AuthPanel zmienia mode na `register`
4. Wypełnia formularz:
   - Email: user@example.com
   - Hasło: SecurePass123!
   - Potwierdź hasło: SecurePass123!
5. Klika "Zarejestruj się"

**Walidacja client-side:**
- ✓ Email ma prawidłowy format
- ✓ Hasło spełnia wymagania (8+ znaków, wielka litera, mała litera, cyfra)
- ✓ Hasła są identyczne

**Wywołanie AuthService.signUp():**
```typescript
const { user, session } = await AuthService.signUp(email, password);
```

**Możliwe rezultaty:**

**A) Sukces - auto-login (MVP):**
```typescript
// Session automatycznie utworzona i zapisana do localStorage
// Użytkownik zalogowany od razu
// Przekierowanie → /generate
```

**B) Błąd - email zajęty:**
```typescript
// error.code === 'auth/email-already-in-use'
// Wyświetl: "Konto z tym adresem email już istnieje"
// Link: "Zaloguj się"
```

**C) Błąd - słabe hasło:**
```typescript
// error.code === 'auth/weak-password'
// Wyświetl: "Hasło jest zbyt słabe. Użyj min. 8 znaków"
```

**Uwaga:** W MVP email verification jest wyłączona, więc użytkownik zawsze otrzymuje scenariusz A (auto-login).

#### 3.4.2. Scenariusz: Logowanie użytkownika

**Kroki:**
1. Użytkownik wchodzi na `/` lub `/login`
2. Widzi AuthPanel w trybie `login`
3. Wypełnia formularz:
   - Email: user@example.com
   - Hasło: SecurePass123!
4. Klika "Zaloguj się"

**Wywołanie AuthService.signIn():**
```typescript
const { user, session } = await AuthService.signIn(email, password);
```

**Możliwe rezultaty:**

**A) Sukces:**
```typescript
// Session zapisana do localStorage
// Token JWT: localStorage.setItem('access_token', session.access_token)
// Przekierowanie → query param 'redirect' lub default '/generate'
// URL: /login?redirect=/flashcards → przekierowanie do /flashcards
```

**B) Błąd - nieprawidłowe dane:**
```typescript
// error.code === 'auth/invalid-credentials'
// Wyświetl: "Nieprawidłowy email lub hasło"
// Pozostaw focus na formularzu
```

**C) Błąd - zbyt wiele prób:**
```typescript
// error.code === 'auth/too-many-requests'
// Wyświetl: "Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut"
// Zablokuj formularz na 15 minut (client-side timer)
```

**Uwaga:** W MVP email verification jest wyłączona, więc błąd "email-not-verified" nie wystąpi.

#### 3.4.3. Scenariusz: Odzyskiwanie hasła

**Kroki:**
1. Użytkownik klika "Zapomniałeś hasła?" w AuthPanel
2. AuthPanel zmienia mode na `forgot-password`
3. Widzi formularz z jednym polem: Email
4. Wypełnia email: user@example.com
5. Klika "Wyślij link resetujący"

**Wywołanie AuthService.resetPasswordRequest():**
```typescript
await AuthService.resetPasswordRequest(email);
```

**Rezultat:**
```typescript
// Email wysłany (nawet jeśli użytkownik nie istnieje - security)
// Wyświetl success message:
// "Jeśli podany adres email jest zarejestrowany, wyślemy na niego link do resetowania hasła"
// Przekierowanie → /check-email (informacyjna strona)
```

**Email otrzymany przez użytkownika:**
```
Temat: Zresetuj hasło - 10x-cards

Witaj,

Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w 10x-cards.

Kliknij poniższy link, aby ustawić nowe hasło:
https://10x-cards.com/reset-password?token=abc123xyz

Link jest ważny przez 1 godzinę.

Jeśli nie prosiłeś o reset hasła, zignoruj tego maila.

---
10x-cards Team
```

**Kroki po kliknięciu w link:**
6. Użytkownik klika link z email → `/reset-password?token=abc123xyz`
7. Widzi formularz z polami:
   - Nowe hasło
   - Potwierdź nowe hasło
8. Wypełnia i klika "Zmień hasło"

**Wywołanie AuthService.updatePassword():**
```typescript
await AuthService.updatePassword(token, newPassword);
```

**Rezultat:**
```typescript
// Hasło zmienione
// Wyświetl success message: "Hasło zostało zmienione"
// Przekierowanie → /login
```

#### 3.4.4. Scenariusz: Dostęp do chronionej strony bez logowania

**Kroki:**
1. Niezalogowany użytkownik próbuje wejść na `/generate`
2. Server-side check w `generate.astro` wykrywa brak sesji
3. Przekierowanie → `/login?redirect=/generate`
4. Użytkownik loguje się
5. Po sukcesie → redirect do `/generate`

**Implementacja w generate.astro:**
```astro
---
import Layout from '@/layouts/Layout.astro';
import { GenerateFlashcardsView } from '@/components/generate/GenerateFlashcardsView';

// Server-side authentication check
const session = await Astro.locals.supabase.auth.getSession();

if (!session.data.session) {
  const redirectUrl = `/login?redirect=${encodeURIComponent(Astro.url.pathname)}`;
  return Astro.redirect(redirectUrl);
}

const user = session.data.session.user;
---

<Layout title="Generuj fiszki - 10x Cards" user={user}>
  <GenerateFlashcardsView client:load />
</Layout>
```

---

## 4. LOGIKA BACKENDOWA

### 4.1. Serwisy autentykacji

#### 4.1.1. AuthService (client-side)

**Lokalizacja:** `src/services/auth-service.ts`

**Odpowiedzialności:**
- Wrapper dla Supabase Auth API
- Zarządzanie sesją w localStorage
- Obsługa błędów i ich translacja
- Refresh tokenów

**Publiczny interfejs:**
```typescript
export class AuthService {
  /**
   * Rejestruje nowego użytkownika
   * @throws AuthError
   */
  static async signUp(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session | null }>;

  /**
   * Loguje użytkownika
   * @throws AuthError
   */
  static async signIn(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session }>;

  /**
   * Wylogowuje użytkownika
   */
  static async signOut(): Promise<void>;

  /**
   * Wysyła email z linkiem do resetowania hasła
   */
  static async resetPasswordRequest(email: string): Promise<void>;

  /**
   * Aktualizuje hasło użytkownika (z tokenem z email)
   * @throws AuthError
   */
  static async updatePassword(
    token: string,
    newPassword: string
  ): Promise<void>;

  /**
   * Pobiera aktualną sesję
   */
  static async getSession(): Promise<Session | null>;

  /**
   * Odświeża wygasającą sesję
   */
  static async refreshSession(): Promise<Session>;

  /**
   * Weryfikuje email użytkownika (z tokenem z email)
   */
  static async verifyEmail(token: string): Promise<void>;

  /**
   * Wysyła ponownie email weryfikacyjny
   */
  static async resendVerificationEmail(): Promise<void>;
}
```

**Implementacja szczegółowa:**

```typescript
import { supabaseClient } from '@/db/supabase.client';
import type { User, Session } from '@supabase/supabase-js';

export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export class AuthService {
  /**
   * Rejestracja nowego użytkownika
   */
  static async signUp(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session | null }> {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        // Redirect URL po weryfikacji email
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new AuthError(
        this.translateError(error),
        error.status?.toString() || 'unknown'
      );
    }

    if (!data.user) {
      throw new AuthError('Rejestracja nie powiodła się', 'no-user');
    }

    // Zapisz session jeśli jest dostępna (auto-login)
    if (data.session) {
      this.saveSession(data.session);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Logowanie użytkownika
   */
  static async signIn(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthError(
        this.translateError(error),
        error.status?.toString() || 'unknown'
      );
    }

    if (!data.session || !data.user) {
      throw new AuthError('Logowanie nie powiodło się', 'no-session');
    }

    // Zapisz session do localStorage
    this.saveSession(data.session);

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Wylogowanie użytkownika
   */
  static async signOut(): Promise<void> {
    await supabaseClient.auth.signOut();
    this.clearSession();
  }

  /**
   * Request password reset
   */
  static async resetPasswordRequest(email: string): Promise<void> {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new AuthError(
        this.translateError(error),
        error.status?.toString() || 'unknown'
      );
    }
  }

  /**
   * Aktualizacja hasła
   */
  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new AuthError(
        this.translateError(error),
        error.status?.toString() || 'unknown'
      );
    }
  }

  /**
   * Pobiera aktualną sesję
   */
  static async getSession(): Promise<Session | null> {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  }

  /**
   * Odświeża sesję
   */
  static async refreshSession(): Promise<Session> {
    const { data, error } = await supabaseClient.auth.refreshSession();

    if (error || !data.session) {
      throw new AuthError('Nie udało się odświeżyć sesji', 'refresh-failed');
    }

    this.saveSession(data.session);
    return data.session;
  }

  /**
   * Wysyła ponownie email weryfikacyjny
   */
  static async resendVerificationEmail(): Promise<void> {
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: '', // Supabase użyje email z aktualnej sesji
    });

    if (error) {
      throw new AuthError(
        this.translateError(error),
        error.status?.toString() || 'unknown'
      );
    }
  }

  /**
   * Zapisuje sesję do localStorage
   */
  private static saveSession(session: Session): void {
    localStorage.setItem('access_token', session.access_token);
    localStorage.setItem('refresh_token', session.refresh_token);
    localStorage.setItem('expires_at', session.expires_at?.toString() || '');
  }

  /**
   * Czyści sesję z localStorage
   */
  private static clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
  }

  /**
   * Tłumaczy błędy Supabase na komunikaty po polsku
   */
  private static translateError(error: any): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Nieprawidłowy email lub hasło',
      'Email not confirmed': 'Potwierdź swój adres email przed logowaniem',
      'User already registered': 'Konto z tym adresem email już istnieje',
      'Password should be at least 8 characters': 'Hasło musi mieć co najmniej 8 znaków',
      'Email rate limit exceeded': 'Zbyt wiele prób. Spróbuj ponownie za chwilę',
      'Invalid email': 'Nieprawidłowy format adresu email',
    };

    return errorMap[error.message] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie';
  }
}
```

### 4.2. Server-Side Authentication Helpers

#### 4.2.1. getAuthenticatedUser (helper dla Astro pages)

**Lokalizacja:** `src/lib/auth/server-auth.ts`

**Odpowiedzialności:**
- Sprawdzenie sesji w Astro pages (server-side)
- Zwrócenie użytkownika lub null
- Używane w protected pages

**Implementacja:**
```typescript
import type { AstroGlobal } from 'astro';
import type { User } from '@supabase/supabase-js';

/**
 * Pobiera zalogowanego użytkownika z sesji (server-side)
 * @returns User object lub null jeśli niezalogowany
 */
export async function getAuthenticatedUser(
  Astro: AstroGlobal
): Promise<User | null> {
  const supabase = Astro.locals.supabase;

  // Sprawdź cookie session
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return null;
  }

  return data.session.user;
}

/**
 * Wymusza autentykację - przekierowuje na /login jeśli brak sesji
 * @throws Astro.redirect
 */
export async function requireAuth(
  Astro: AstroGlobal
): Promise<User> {
  const user = await getAuthenticatedUser(Astro);

  if (!user) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(Astro.url.pathname)}`;
    return Astro.redirect(redirectUrl);
  }

  return user;
}
```

**Przykład użycia w Astro page:**
```astro
---
// src/pages/generate.astro
import Layout from '@/layouts/Layout.astro';
import { requireAuth } from '@/lib/auth/server-auth';

// Server-side authentication check
const user = await requireAuth(Astro);
---

<Layout title="Generuj fiszki" user={user}>
  <!-- Chroniona treść -->
</Layout>
```

### 4.3. Middleware dla stron (Page Auth Middleware)

#### 4.3.1. pageAuthMiddleware

**Lokalizacja:** `src/middleware/page-auth.ts` (nowy plik)

**Odpowiedzialności:**
- Automatyczne sprawdzanie sesji dla chronionych routes
- Przekierowanie niezalogowanych użytkowników na /login
- Injekcja user do Astro.locals dla łatwego dostępu

**Lista chronionych routes:**
- `/generate`
- `/flashcards`
- `/flashcards/*`
- `/account`
- `/settings`

**Implementacja:**
```typescript
import type { MiddlewareHandler } from 'astro';

/**
 * Protected routes wymagające autentykacji
 */
const PROTECTED_ROUTES = [
  '/generate',
  '/flashcards',
  '/account',
  '/settings',
];

/**
 * Sprawdza czy route jest chroniony
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Middleware sprawdzający autentykację dla chronionych stron
 */
export const pageAuthMiddleware: MiddlewareHandler = async (context, next) => {
  const { url, locals, redirect } = context;

  // Ignoruj API routes (obsługiwane przez authMiddleware)
  if (url.pathname.startsWith('/api')) {
    return next();
  }

  // Ignoruj public routes
  if (!isProtectedRoute(url.pathname)) {
    return next();
  }

  // Sprawdź sesję
  const { data } = await locals.supabase.auth.getSession();

  if (!data.session) {
    // Brak sesji - przekieruj na login z redirect param
    const redirectUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
    return redirect(redirectUrl);
  }

  // Zapisz user do locals dla łatwego dostępu w pages
  locals.user = data.session.user;

  return next();
};
```

**Aktualizacja `src/middleware/index.ts`:**
```typescript
import { sequence } from 'astro:middleware';
import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';
import { authMiddleware } from './auth.ts';
import { pageAuthMiddleware } from './page-auth.ts'; // NOWY
import { rateLimitMiddleware } from './rate-limit.ts';

/**
 * Middleware to inject Supabase client into context.locals
 */
const supabaseMiddleware = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});

/**
 * Combined middleware pipeline
 * 1. Inject Supabase client
 * 2. Check page authentication (for protected pages)
 * 3. Authenticate API requests (for /api routes)
 * 4. Apply rate limiting (for /api routes)
 */
export const onRequest = sequence(
  supabaseMiddleware,
  pageAuthMiddleware,  // NOWY - sprawdza strony
  authMiddleware,      // Sprawdza /api routes
  rateLimitMiddleware
);
```

### 4.4. API Endpoints (opcjonalne proxy endpoints)

Chociaż autentykacja jest głównie obsługiwana przez Supabase client-side, możemy stworzyć opcjonalne proxy endpoints dla dodatkowej kontroli i logowania.

#### 4.4.1. POST /api/auth/register (opcjonalny)

**Lokalizacja:** `src/pages/api/auth/register.ts`

**Odpowiedzialności:**
- Proxy do Supabase signUp
- Server-side validation
- Logowanie rejestracji

**Implementacja:**
```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(8, 'Hasło musi mieć min. 8 znaków'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse i walidacja
    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

    // Rejestracja przez Supabase
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    // TODO: Logowanie do analytics/monitoring
    console.log(`New user registered: ${email}`);

    return new Response(
      JSON.stringify({
        user: data.user,
        session: data.session,
      }),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Wewnętrzny błąd serwera' }),
      { status: 500 }
    );
  }
};
```

#### 4.4.2. POST /api/auth/login (opcjonalny)

**Lokalizacja:** `src/pages/api/auth/login.ts`

Analogiczna implementacja jak `/api/auth/register`.

### 4.5. Obsługa ciasteczek (Cookies)

Supabase automatycznie zarządza session cookies. Konfiguracja w Astro:

**Astro config (`astro.config.mjs`):**
```javascript
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  // Konfiguracja cookies dla Supabase
  server: {
    headers: {
      'Access-Control-Allow-Credentials': 'true',
    },
  },
});
```

**Supabase client konfiguracja:**
```typescript
// src/db/supabase.client.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseClient = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_KEY,
  {
    auth: {
      // Automatyczne zarządzanie storage
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Wykrywa session z URL (callback)
    },
  }
);
```

---

## 5. SYSTEM AUTENTYKACJI SUPABASE

### 5.1. Konfiguracja Supabase Auth

**Dashboard Supabase → Authentication → Settings:**

```yaml
# Email Configuration
Site URL: https://10x-cards.com
Redirect URLs:
  - https://10x-cards.com/auth/callback
  - http://localhost:3000/auth/callback (development)

# Email Templates
Confirm Signup:
  Subject: "Potwierdź swój email - 10x-cards"
  Body: "Kliknij link aby potwierdzić: {{ .ConfirmationURL }}"

Reset Password:
  Subject: "Zresetuj hasło - 10x-cards"
  Body: "Kliknij link aby zresetować hasło: {{ .ConfirmationURL }}"

Magic Link:
  Subject: "Zaloguj się do 10x-cards"
  Body: "Kliknij link aby się zalogować: {{ .ConfirmationURL }}"

# Security
Email Confirmation: ENABLED (wymagana weryfikacja email)
Password Requirements:
  - Minimum length: 8
  - Require uppercase: false
  - Require lowercase: false
  - Require numbers: false
  - Require special chars: false

Rate Limiting:
  - Max emails per hour: 4
  - Max login attempts: 5 per 15 minutes

# Sessions
JWT Expiry: 3600 seconds (1 hour)
Refresh Token Rotation: ENABLED
```

### 5.2. Email Verification Flow

**Włączone: Weryfikacja email przed logowaniem**

**Przepływ:**
1. Użytkownik rejestruje się → `AuthService.signUp()`
2. Supabase tworzy użytkownika z `email_confirmed_at = null`
3. Supabase wysyła email z linkiem weryfikacyjnym
4. Link: `https://10x-cards.com/auth/callback?token=...&type=signup`
5. Użytkownik klika link
6. Astro page `/auth/callback` obsługuje callback
7. Supabase ustawia `email_confirmed_at = NOW()`
8. Przekierowanie → `/generate` z automatycznym logowaniem

**Implementacja `/auth/callback`:**

**Lokalizacja:** `src/pages/auth/callback.astro`

**Uwaga:** W MVP ten endpoint jest używany głównie dla password reset flow. Email verification jest wyłączona.

```astro
---
/**
 * Auth Callback Handler
 * Obsługuje callbacks z Supabase (głównie password reset w MVP)
 * W przyszłości będzie obsługiwać także email verification i social auth
 */

const supabase = Astro.locals.supabase;

// Pobierz hash z URL (Supabase używa hash routing)
const hashParams = new URLSearchParams(Astro.url.hash.slice(1));
const accessToken = hashParams.get('access_token');
const refreshToken = hashParams.get('refresh_token');
const type = hashParams.get('type');

if (accessToken && refreshToken) {
  // Ustaw session w Supabase
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('Error setting session:', error);
    return Astro.redirect('/login?error=auth_callback_failed');
  }

  // Przekieruj w zależności od typu
  if (type === 'recovery') {
    // Password reset - przekieruj do formularza zmiany hasła
    return Astro.redirect('/reset-password?token=' + accessToken);
  } else if (type === 'signup') {
    // Email verification (przyszłość - obecnie wyłączone w MVP)
    return Astro.redirect('/generate?verified=true');
  }

  // Default redirect
  return Astro.redirect('/generate');
}

// Jeśli brak tokenów - błąd
return Astro.redirect('/login?error=invalid_callback');
---

<!DOCTYPE html>
<html>
  <head>
    <title>Przekierowywanie...</title>
    <meta http-equiv="refresh" content="0; url=/login" />
  </head>
  <body>
    <p>Przekierowywanie...</p>
  </body>
</html>
```

### 5.3. Password Reset Flow

**Przepływ:**
1. Użytkownik klika "Zapomniałeś hasła?" w AuthPanel
2. Wypełnia email → `AuthService.resetPasswordRequest(email)`
3. Supabase wysyła email z linkiem:
   `https://10x-cards.com/auth/callback?token=...&type=recovery`
4. Użytkownik klika link → `/auth/callback` obsługuje callback
5. Przekierowanie → `/reset-password?token=...`
6. Formularz z nowym hasłem
7. Submit → `AuthService.updatePassword(newPassword)`
8. Sukces → przekierowanie `/login?password_reset=success`

**Implementacja `/reset-password`:**

**Lokalizacja:** `src/pages/reset-password.astro`

```astro
---
import Layout from '@/layouts/Layout.astro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const token = Astro.url.searchParams.get('token');

if (!token) {
  return Astro.redirect('/login?error=invalid_reset_link');
}
---

<Layout title="Zresetuj hasło - 10x-cards">
  <div class="max-w-md mx-auto mt-16">
    <Card>
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="reset-password-form" class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium mb-2">
              Nowe hasło
            </label>
            <input
              type="password"
              id="password"
              name="password"
              minlength="8"
              required
              class="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label for="confirm-password" class="block text-sm font-medium mb-2">
              Potwierdź hasło
            </label>
            <input
              type="password"
              id="confirm-password"
              name="confirmPassword"
              minlength="8"
              required
              class="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div id="error-message" class="text-red-500 text-sm hidden"></div>

          <button
            type="submit"
            class="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90"
          >
            Zmień hasło
          </button>
        </form>
      </CardContent>
    </Card>
  </div>
</Layout>

<script>
  import { AuthService } from '@/services/auth-service';

  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
    const errorDiv = document.getElementById('error-message');

    if (password !== confirmPassword) {
      errorDiv!.textContent = 'Hasła nie są identyczne';
      errorDiv!.classList.remove('hidden');
      return;
    }

    try {
      await AuthService.updatePassword(password);
      window.location.href = '/login?password_reset=success';
    } catch (error: any) {
      errorDiv!.textContent = error.message;
      errorDiv!.classList.remove('hidden');
    }
  });
</script>
```

### 5.4. Session Management

**Token Lifecycle:**

```
┌─────────────────────────────────────────────┐
│  User Login                                  │
│  ↓                                           │
│  Supabase Issues JWT (1h expiry)            │
│  ↓                                           │
│  Save to localStorage:                       │
│    - access_token                            │
│    - refresh_token                           │
│    - expires_at                              │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  API Requests                                │
│  ↓                                           │
│  axios interceptor adds:                     │
│    Authorization: Bearer {access_token}      │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Token Expiry (after 55 min)                │
│  ↓                                           │
│  SessionProvider detects expiry              │
│  ↓                                           │
│  Auto-refresh using refresh_token            │
│  ↓                                           │
│  Save new access_token to localStorage       │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Refresh Token Expiry (after 30 days)       │
│  ↓                                           │
│  User must re-login                          │
│  ↓                                           │
│  Redirect to /login                          │
└─────────────────────────────────────────────┘
```

**Auto-refresh implementacja w SessionProvider:**

```typescript
// SessionProvider.tsx
useEffect(() => {
  if (!session) return;

  const expiresAt = session.expires_at * 1000; // Convert to ms
  const now = Date.now();
  const refreshAt = expiresAt - 5 * 60 * 1000; // 5 min before expiry
  const timeout = refreshAt - now;

  if (timeout > 0) {
    console.log(`Scheduling token refresh in ${timeout / 1000}s`);

    const timer = setTimeout(async () => {
      console.log('Refreshing access token...');
      try {
        await refreshSession();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Redirect to login
        window.location.href = '/login?session_expired=true';
      }
    }, timeout);

    return () => clearTimeout(timer);
  }
}, [session]);
```

---

## 6. ROUTING I STRUKTURA STRON

### 6.1. Kompletna mapa routes

```
src/pages/
├── index.astro               # Landing page (/ - public)
│                             # - Pokazuje AuthPanel dla niezalogowanych
│                             # - Przekierowuje do /generate dla zalogowanych
│
├── login.astro               # Dedykowana strona logowania (opcjonalna)
│                             # Query params: ?redirect=/target-path
│
├── register.astro            # Dedykowana strona rejestracji (opcjonalna)
│
├── forgot-password.astro     # Formularz odzyskiwania hasła (MVP)
│
├── reset-password.astro      # Formularz ustawiania nowego hasła (MVP)
│                             # Query params: ?token=...
│
├── generate.astro            # Generowanie fiszek (PROTECTED)
│                             # Wymaga: authenticated session
│
├── flashcards.astro          # Lista fiszek użytkownika (PROTECTED - przyszłość)
│
├── account.astro             # Ustawienia konta (PROTECTED - przyszłość)
│
├── auth/
│   └── callback.astro        # Callback handler dla Supabase (opcjonalny)
│                             # Query params: ?token=...&type=recovery
│                             # Obsługuje głównie password reset callback
│
└── api/
    ├── generations.ts        # API: Generowanie fiszek (PROTECTED)
    ├── flashcards/
    │   └── batch.ts          # API: Batch zapis fiszek (PROTECTED)
    └── auth/ (opcjonalne)
        ├── register.ts       # Proxy: Rejestracja
        └── login.ts          # Proxy: Logowanie
```

### 6.2. Implementacja kluczowych stron

#### 6.2.1. src/pages/index.astro (aktualizacja)

```astro
---
import Welcome from '@/components/Welcome.astro';
import Layout from '@/layouts/Layout.astro';

// Sprawdź sesję
const { data } = await Astro.locals.supabase.auth.getSession();

// Jeśli zalogowany, przekieruj do /generate
if (data.session) {
  return Astro.redirect('/generate');
}
---

<Layout title="10x-cards - AI-powered flashcards">
  <Welcome />
</Layout>
```

#### 6.2.2. src/pages/login.astro (nowa strona)

```astro
---
import Layout from '@/layouts/Layout.astro';
import { AuthPanel } from '@/components/auth/AuthPanel';

// Jeśli już zalogowany, przekieruj
const { data } = await Astro.locals.supabase.auth.getSession();
if (data.session) {
  return Astro.redirect('/generate');
}

// Pobierz redirect param
const redirectTo = Astro.url.searchParams.get('redirect') || '/generate';
---

<Layout title="Zaloguj się - 10x-cards">
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">Witaj ponownie!</h1>
        <p class="text-muted-foreground">Zaloguj się do swojego konta</p>
      </div>

      <AuthPanel mode="login" redirectTo={redirectTo} client:load />
    </div>
  </div>
</Layout>
```

#### 6.2.3. src/pages/verify-email.astro (nowa strona)

```astro
---
import Layout from '@/layouts/Layout.astro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const { data } = await Astro.locals.supabase.auth.getSession();
const userEmail = data.session?.user?.email;
---

<Layout title="Potwierdź email - 10x-cards">
  <div class="max-w-md mx-auto mt-16">
    <Card>
      <CardHeader>
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <CardTitle class="text-center">Sprawdź swoją skrzynkę email</CardTitle>
      </CardHeader>

      <CardContent class="text-center space-y-4">
        <p class="text-muted-foreground">
          Wysłaliśmy link weryfikacyjny na adres:
        </p>
        <p class="font-semibold">{userEmail}</p>
        <p class="text-sm text-muted-foreground">
          Kliknij link w emailu, aby aktywować swoje konto i rozpocząć naukę.
        </p>

        <div class="pt-4">
          <p class="text-sm text-muted-foreground mb-2">
            Nie otrzymałeś emaila?
          </p>
          <Button variant="outline" id="resend-email">
            Wyślij ponownie
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</Layout>

<script>
  import { AuthService } from '@/services/auth-service';

  document.getElementById('resend-email')?.addEventListener('click', async () => {
    const button = document.getElementById('resend-email') as HTMLButtonElement;
    button.disabled = true;
    button.textContent = 'Wysyłanie...';

    try {
      await AuthService.resendVerificationEmail();
      button.textContent = 'Wysłano!';
      setTimeout(() => {
        button.disabled = false;
        button.textContent = 'Wyślij ponownie';
      }, 3000);
    } catch (error) {
      button.textContent = 'Błąd - spróbuj ponownie';
      button.disabled = false;
    }
  });
</script>
```

#### 6.2.4. src/pages/generate.astro (aktualizacja z auth)

```astro
---
import Layout from '@/layouts/Layout.astro';
import { GenerateFlashcardsView } from '@/components/generate/GenerateFlashcardsView';
import { requireAuth } from '@/lib/auth/server-auth';

// Wymaga autentykacji - automatyczne przekierowanie na /login
const user = await requireAuth(Astro);
---

<Layout title="Generuj fiszki - 10x Cards" user={user}>
  <GenerateFlashcardsView client:load />
</Layout>
```

---

## 7. OBSŁUGA BŁĘDÓW I EDGE CASES

### 7.1. Scenariusze błędów

#### 7.1.1. Błędy rejestracji

| Błąd | Kod | Komunikat | Akcja |
|------|-----|-----------|-------|
| Email zajęty | `auth/email-already-in-use` | "Konto z tym adresem email już istnieje" | Link do logowania |
| Słabe hasło | `auth/weak-password` | "Hasło musi mieć min. 8 znaków" | Highlight pole hasła |
| Nieprawidłowy email | `auth/invalid-email` | "Nieprawidłowy format adresu email" | Highlight pole email |
| Rate limit | `auth/too-many-requests` | "Zbyt wiele prób. Spróbuj za 15 minut" | Zablokuj formularz |
| Błąd sieci | `network-error` | "Sprawdź połączenie internetowe" | Retry button |

#### 7.1.2. Błędy logowania

| Błąd | Kod | Komunikat | Akcja |
|------|-----|-----------|-------|
| Nieprawidłowe dane | `auth/invalid-credentials` | "Nieprawidłowy email lub hasło" | Focus na formularz |
| Email niezweryfikowany | `auth/email-not-verified` | "Potwierdź email przed logowaniem" | Link "Wyślij ponownie" |
| Konto zablokowane | `auth/user-disabled` | "Konto zostało zablokowane" | Kontakt support |
| Zbyt wiele prób | `auth/too-many-requests` | "Zbyt wiele prób. Spróbuj za 15 min" | Timer countdown |

#### 7.1.3. Błędy sesji

| Błąd | Kod | Komunikat | Akcja |
|------|-----|-----------|-------|
| Token wygasł | `auth/token-expired` | "Sesja wygasła. Zaloguj się ponownie" | Redirect /login |
| Nieprawidłowy token | `auth/invalid-token` | "Sesja nieważna. Zaloguj się ponownie" | Redirect /login |
| Refresh failed | `auth/refresh-failed` | "Nie można odświeżyć sesji" | Redirect /login |

### 7.2. Obsługa edge cases

#### 7.2.1. Email verification - link wygasł

```typescript
// W /auth/callback
if (error?.message === 'Token has expired') {
  return Astro.redirect('/verify-email?expired=true');
}
```

**W verify-email.astro:**
```astro
{Astro.url.searchParams.get('expired') === 'true' && (
  <Alert variant="warning">
    <AlertTitle>Link wygasł</AlertTitle>
    <AlertDescription>
      Link weryfikacyjny jest ważny przez 24h. Kliknij "Wyślij ponownie" aby otrzymać nowy.
    </AlertDescription>
  </Alert>
)}
```

#### 7.2.2. Użytkownik próbuje zarejestrować się drugim razem

**Wykrycie:** Email już istnieje w Supabase

**Obsługa:**
```typescript
if (error.code === 'auth/email-already-in-use') {
  setError('Konto z tym adresem już istnieje.');
  setSuccessMessage(
    'Jeśli to Twoje konto, zaloguj się. Jeśli zapomniałeś hasła, użyj opcji "Zapomniałeś hasła?".'
  );
  // Zmień mode na login
  setTimeout(() => setMode('login'), 3000);
}
```

#### 7.2.3. Concurrent sessions (użytkownik zalogowany na wielu urządzeniach)

**Obsługa:** Supabase automatycznie zarządza wieloma sesjami

**Wylogowanie:**
- `signOut()` wylogowuje tylko bieżącą sesję
- Inne sesje pozostają aktywne (security best practice)

#### 7.2.4. User navigates directly to /generate without login

**Obsługa:** pageAuthMiddleware

```typescript
// middleware/page-auth.ts automatycznie przekierowuje
if (!session) {
  return redirect(`/login?redirect=${pathname}`);
}
```

#### 7.2.5. Token refresh podczas aktywnego requestu API

**Obsługa:** axios interceptor + retry logic

```typescript
// W api/client.ts
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Spróbuj odświeżyć token
        await AuthService.refreshSession();

        // Retry original request z nowym tokenem
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - przekieruj na login
        window.location.href = '/login?session_expired=true';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 8. WYMAGANIA NIEFUNKCJONALNE

### 8.1. Bezpieczeństwo

#### 8.1.1. Password Security

**Wymagania:**
- Minimalna długość: 8 znaków
- Hasła hashowane przez Supabase (bcrypt)
- Rate limiting: max 5 prób logowania / 15 minut
- Password reset link ważny 1 godzinę

**Dobre praktyki:**
- Nie zwracaj szczegółów błędu ("user not found" vs "invalid credentials")
- Nie pokazuj czy email istnieje w systemie (security by obscurity)
- (MVP: Email verification wyłączona dla uproszczenia onboardingu - można włączyć w przyszłości)

#### 8.1.2. Token Security

**JWT Tokens:**
- Przechowywane w localStorage (XSS risk - akceptowalne dla MVP)
- HTTPOnly cookies dla refresh tokenów (lepsza security - TODO przyszłość)
- Krótki czas życia access token (1h)
- Długi czas życia refresh token (30 dni)

**CSRF Protection:**
- Supabase automatycznie dodaje CSRF protection
- Double-submit cookie pattern

#### 8.1.3. Rate Limiting

**Middleware (już zaimplementowane):**
- `/api/auth/register`: 5 requests / 15 min per IP
- `/api/auth/login`: 5 requests / 15 min per IP
- Email sending: 4 emails / hour per user

### 8.2. Wydajność

#### 8.2.1. Server-Side Rendering

**Optymalizacje:**
- Session check w middleware (nie w każdej page osobno)
- Cache user data w context.locals
- Minimize Supabase API calls

#### 8.2.2. Client-Side

**Optymalizacje:**
- Lazy load AuthPanel komponent
- Debounce password strength indicator
- Client-side validation przed server call

**Implementacja:**
```typescript
// Password validation z debounce
const [passwordError, setPasswordError] = useState<string | null>(null);

const validatePasswordDebounced = useMemo(
  () => debounce((password: string) => {
    if (password.length < 8) {
      setPasswordError('Min. 8 znaków');
    } else {
      setPasswordError(null);
    }
  }, 300),
  []
);

useEffect(() => {
  validatePasswordDebounced(formData.password);
}, [formData.password]);
```

### 8.3. Dostępność (a11y)

**Wymagania:**
- Wszystkie formularze z właściwymi `<label>` elementami
- Errory oznaczone `aria-invalid` i `aria-describedby`
- Focus management po błędach
- Keyboard navigation (Tab, Enter, Escape)

**Implementacja:**
```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    aria-invalid={!!emailError}
    aria-describedby={emailError ? 'email-error' : undefined}
    required
  />
  {emailError && (
    <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
      {emailError}
    </p>
  )}
</div>
```

### 8.4. Responsywność

**Breakpoints (Tailwind):**
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: > 1024px (xl)

**AuthPanel:**
- Mobile: Full width, padding 16px
- Desktop: Max-width 448px (28rem), centered

### 8.5. Zgodność z RODO

**Wymagania z PRD:**
- Dane osobowe w Supabase (EU region)
- Prawo do usunięcia konta
- Prawo do exportu danych
- Zgoda na przetwarzanie danych (Terms checkbox przy rejestracji)

**Implementacja checkbox zgody:**
```tsx
<div className="flex items-start space-x-2">
  <Checkbox
    id="terms"
    checked={agreedToTerms}
    onCheckedChange={setAgreedToTerms}
    required
  />
  <label htmlFor="terms" className="text-sm text-muted-foreground">
    Zgadzam się na{' '}
    <a href="/terms" className="underline">
      Regulamin
    </a>{' '}
    i{' '}
    <a href="/privacy" className="underline">
      Politykę Prywatności
    </a>
  </label>
</div>
```

---

## 9. TESTOWANIE

### 9.1. Scenariusze testowe

#### 9.1.1. Testy rejestracji

**Test 1: Pomyślna rejestracja z auto-login (MVP)**
```
Given: Użytkownik na stronie rejestracji
When: Wypełnia poprawny email i hasło
And: Klika "Zarejestruj się"
Then: Jest natychmiast zalogowany
And: Jest przekierowany na /generate
And: Session JWT jest zapisana w localStorage
And: Widzi swoje dane w UserMenu
```

**Test 2: Rejestracja z istniejącym emailem**
```
Given: Email już istnieje w systemie
When: Użytkownik próbuje się zarejestrować
Then: Widzi błąd "Konto z tym emailem już istnieje"
And: Otrzymuje link do logowania
```

**Test 3: Walidacja hasła**
```
Given: Użytkownik na formularzu rejestracji
When: Wpisuje hasło krócej niż 8 znaków
Then: Widzi błąd "Hasło musi mieć min. 8 znaków"
And: Przycisk submit jest nieaktywny
```

#### 9.1.2. Testy logowania

**Test 4: Pomyślne logowanie**
```
Given: Zarejestrowany użytkownik z zweryfikowanym emailem
When: Loguje się poprawnymi danymi
Then: Jest przekierowany na /generate
And: Widzi swój email w UserMenu
And: Token JWT jest zapisany w localStorage
```

**Test 5: Nieprawidłowe hasło**
```
Given: Użytkownik na stronie logowania
When: Wpisuje prawidłowy email i błędne hasło
Then: Widzi błąd "Nieprawidłowy email lub hasło"
And: Pozostaje na stronie logowania
And: Hasło jest wyczyszczone
```

**Test 6: Rate limiting logowania**
```
Given: Użytkownik próbuje się zalogować
When: Podaje nieprawidłowe dane 5 razy z rzędu
Then: Widzi błąd "Zbyt wiele prób logowania"
And: Formularz jest zablokowany na 15 minut
And: Licznik odlicza czas do odblokowania
```

#### 9.1.3. Testy protected routes

**Test 7: Dostęp do /generate bez logowania**
```
Given: Niezalogowany użytkownik
When: Próbuje wejść na /generate
Then: Jest przekierowany na /login?redirect=/generate
And: Po zalogowaniu wraca na /generate
```

**Test 8: Sesja wygasła podczas pracy**
```
Given: Zalogowany użytkownik na /generate
When: Token JWT wygasa (po 1h)
Then: Następny API request zwraca 401
And: Interceptor próbuje odświeżyć token
And: Użytkownik kontynuuje pracę bez przerwy
```

#### 9.1.4. Testy password reset

**Test 9: Reset hasła - pełny flow**
```
Given: Użytkownik zapomniał hasła
When: Klika "Zapomniałeś hasła?"
And: Wpisuje email i klika "Wyślij link"
Then: Otrzymuje email z linkiem
When: Klika link w emailu
Then: Jest przekierowany na /reset-password?token=...
When: Wpisuje nowe hasło i potwierdza
Then: Hasło jest zmienione
And: Jest przekierowany na /login
And: Może się zalogować nowym hasłem
```

### 9.2. Testy automatyczne (propozycja)

#### 9.2.1. Unit tests

**AuthService tests:**
```typescript
// src/services/__tests__/auth-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../auth-service';

describe('AuthService', () => {
  describe('signUp', () => {
    it('should register user and save session', async () => {
      // Mock Supabase client
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: {} },
        error: null,
      });

      // Test registration
      const result = await AuthService.signUp('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(localStorage.getItem('access_token')).toBeDefined();
    });

    it('should throw error for existing email', async () => {
      // Mock error response
      const mockSignUp = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      });

      await expect(
        AuthService.signUp('existing@example.com', 'password123')
      ).rejects.toThrow('Konto z tym adresem email już istnieje');
    });
  });
});
```

#### 9.2.2. Integration tests

**Auth flow tests z Playwright:**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register, verify email, and login', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Click "Utwórz konto"
    await page.click('text=Utwórz nowe konto');

    // 3. Fill registration form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');

    // 4. Submit
    await page.click('button[type="submit"]');

    // 5. Should be redirected to /generate (auto-login in MVP)
    await expect(page).toHaveURL('/generate');

    // 6. Should see user menu with email
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });

  test('should login and access protected page', async ({ page }) => {
    // Arrange: Pre-create verified user
    // ...

    // Act: Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Assert: Redirected to /generate
    await expect(page).toHaveURL('/generate');
    await expect(page.locator('text=existing@example.com')).toBeVisible();
  });

  test('should redirect to login when accessing protected page', async ({ page }) => {
    await page.goto('/generate');

    // Should redirect to login
    await expect(page).toHaveURL('/login?redirect=%2Fgenerate');
  });
});
```

---

## 10. PLAN IMPLEMENTACJI

### 10.1. Kolejność implementacji (fazowanie)

#### **Faza 1: Core Auth Service (1-2 dni)**
1. Implementacja `AuthService` w `src/services/auth-service.ts`
2. Testowanie wszystkich metod (signUp, signIn, signOut, itp.)
3. Konfiguracja Supabase email templates

#### **Faza 2: UI Components (1-2 dni)**
4. Rozbudowa `AuthPanel.tsx` o funkcjonalność
5. Implementacja `UserMenu.tsx`
6. Implementacja `SessionProvider.tsx`
7. Dodanie `Navigation.astro`

#### **Faza 3: Pages & Routing (1 dzień)**
8. Implementacja `/auth/callback.astro`
9. Implementacja `/verify-email.astro`
10. Implementacja `/reset-password.astro`
11. Aktualizacja `index.astro` (redirect dla zalogowanych)
12. Aktualizacja `generate.astro` (auth check)

#### **Faza 4: Middleware (1 dzień)**
13. Implementacja `pageAuthMiddleware` w `src/middleware/page-auth.ts`
14. Aktualizacja `src/middleware/index.ts` (kompozycja)
15. Implementacja `requireAuth` helper w `src/lib/auth/server-auth.ts`

#### **Faza 5: Edge Cases & Polish (1 dzień)**
16. Obsługa wszystkich scenariuszy błędów
17. Token auto-refresh w SessionProvider
18. Rate limiting messages
19. Success/error toasts

#### **Faza 6: Testing (1-2 dni)**
20. Manualne testy wszystkich flow
21. Testy na różnych urządzeniach (mobile, desktop)
22. Testy edge cases
23. Security audit

**Łączny szacunek: 6-9 dni roboczych**

### 10.2. Checklist implementacji

#### **Backend:**
- [ ] AuthService.signUp()
- [ ] AuthService.signIn()
- [ ] AuthService.signOut()
- [ ] AuthService.resetPasswordRequest()
- [ ] AuthService.updatePassword()
- [ ] AuthService.getSession()
- [ ] AuthService.refreshSession()
- [ ] AuthService.resendVerificationEmail()
- [ ] Error translation (translateError)

#### **Middleware:**
- [ ] pageAuthMiddleware dla protected pages
- [ ] requireAuth helper
- [ ] getAuthenticatedUser helper
- [ ] Aktualizacja middleware pipeline

#### **Components:**
- [ ] AuthPanel - handleLogin()
- [ ] AuthPanel - handleRegister()
- [ ] AuthPanel - handleForgotPassword()
- [ ] AuthPanel - client-side validation
- [ ] AuthPanel - error handling
- [ ] UserMenu component
- [ ] SessionProvider context
- [ ] Navigation component z conditional rendering

#### **Pages:**
- [ ] /auth/callback.astro (handle password reset callbacks - MVP)
- [ ] /forgot-password.astro (formularz odzyskiwania hasła)
- [ ] /reset-password.astro (formularz zmiany hasła)
- [ ] /login.astro (opcjonalna dedykowana strona)
- [ ] Aktualizacja /index.astro (redirect dla zalogowanych)
- [ ] Aktualizacja /generate.astro (auth check + requireAuth)

#### **Layout:**
- [ ] Aktualizacja Layout.astro (Navigation + user prop)

#### **Supabase Config:**
- [ ] Email templates (Confirm Signup, Reset Password)
- [ ] Redirect URLs whitelist
- [ ] Enable email confirmation
- [ ] Configure JWT expiry
- [ ] Test email delivery

#### **Security:**
- [ ] Rate limiting dla auth endpoints
- [ ] CSRF protection verify
- [ ] Password complexity validation
- [ ] Token auto-refresh implementation

#### **Testing:**
- [ ] Test rejestracji (auto-login)
- [ ] Test logowania
- [ ] Test password reset flow (forgot → email → reset)
- [ ] Test protected routes (redirect do /login)
- [ ] Test token refresh (auto-refresh przed wygaśnięciem)
- [ ] Test wylogowania (clear localStorage + redirect)
- [ ] Test edge cases (rate limiting, token expired, concurrent sessions)

---

## 11. METRYKI I MONITORING

### 11.1. Kluczowe metryki

**Auth Metrics (do zaimplementowania w przyszłości):**
```typescript
// Analytics events
analytics.track('user_registered', {
  email: user.email,
  verification_required: !user.emailConfirmed,
  timestamp: new Date().toISOString(),
});

analytics.track('user_logged_in', {
  email: user.email,
  timestamp: new Date().toISOString(),
});

analytics.track('password_reset_requested', {
  email: email,
  timestamp: new Date().toISOString(),
});
```

**Metryki do monitorowania:**
- Liczba rejestracji / dzień
- Conversion rate (rejestracja → pierwszy login w MVP, brak weryfikacji email)
- Liczba nieudanych prób logowania
- Liczba password reset requests
- Token refresh rate (jak często users potrzebują odświeżyć token)
- 401 errors rate (wskaźnik problemów z sesją)
- Średni czas od rejestracji do pierwszej fiszki (user engagement)

### 11.2. Logi dla debugowania

**Server-side logging:**
```typescript
// W middleware
console.log('[Auth] User authenticated:', {
  userId: user.id,
  email: user.email,
  path: pathname,
  timestamp: new Date().toISOString(),
});

// W AuthService
console.error('[Auth] Login failed:', {
  email: email,
  error: error.message,
  code: error.code,
  timestamp: new Date().toISOString(),
});
```

---

## 12. DOKUMENTACJA DLA DEVELOPERÓW

### 12.1. Quick Start Guide

**Jak dodać authentication do nowej strony:**

```astro
---
// 1. Import requireAuth helper
import { requireAuth } from '@/lib/auth/server-auth';
import Layout from '@/layouts/Layout.astro';

// 2. Sprawdź auth (automatyczne przekierowanie jeśli brak)
const user = await requireAuth(Astro);
---

<Layout title="My Protected Page" user={user}>
  <h1>Witaj, {user.email}!</h1>
  <!-- Chroniona treść -->
</Layout>
```

**Jak używać AuthService w React komponencie:**

```typescript
import { AuthService } from '@/services/auth-service';

const handleLogin = async () => {
  try {
    const { user, session } = await AuthService.signIn(email, password);
    console.log('Logged in:', user.email);
    window.location.href = '/generate';
  } catch (error) {
    console.error('Login failed:', error.message);
    setError(error.message);
  }
};
```

**Jak dostać dane użytkownika w React (client-side):**

```typescript
import { useSession } from '@/components/auth/SessionProvider';

function MyComponent() {
  const { user, session, isLoading } = useSession();

  if (isLoading) return <div>Ładowanie...</div>;
  if (!user) return <div>Niezalogowany</div>;

  return <div>Witaj, {user.email}!</div>;
}
```

### 12.2. Environment Variables

**Wymagane zmienne środowiskowe:**

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Development
NODE_ENV=development  # Włącza mock user w auth middleware
```

**Supabase Dashboard:**
- Project URL: Settings → API → Project URL
- Anon key: Settings → API → anon public
- Service role key: Settings → API → service_role (⚠️ NIGDY nie commituj!)

### 12.3. Debugging Tips

**Problem: User redirected to login immediately after login**

Sprawdź:
1. Czy token jest zapisany w localStorage: `localStorage.getItem('access_token')`
2. Czy API client dodaje header Authorization
3. Czy middleware poprawnie weryfikuje token

**Problem: Token refresh nie działa**

Sprawdź:
1. Czy SessionProvider jest owinięty wokół app
2. Czy refresh_token jest zapisany w localStorage
3. Czy Supabase ma włączone "Refresh Token Rotation"

**Problem: Password reset nie działa**

Sprawdź:
1. Czy Redirect URL jest na whiteliście w Supabase Dashboard
2. Czy `/auth/callback` poprawnie obsługuje hash params dla type='recovery'
3. Czy email został faktycznie wysłany (sprawdź Supabase logs)
4. Czy token z URL jest przekazywany do formularza reset-password

---

## 13. DOKUMENTACJA API KONTRAKTÓW

### 13.1. AuthService Contract

```typescript
/**
 * Główny serwis autentykacji - wrapper dla Supabase Auth
 */
export interface IAuthService {
  /**
   * Rejestruje nowego użytkownika
   * @param email - Adres email użytkownika
   * @param password - Hasło (min. 8 znaków)
   * @returns Promise z danymi użytkownika i sesją
   * @throws AuthError jeśli rejestracja nie powiedzie się
   */
  signUp(email: string, password: string): Promise<AuthResult>;

  /**
   * Loguje użytkownika
   * @param email - Adres email
   * @param password - Hasło
   * @returns Promise z danymi użytkownika i sesją
   * @throws AuthError jeśli logowanie nie powiedzie się
   */
  signIn(email: string, password: string): Promise<AuthResult>;

  /**
   * Wylogowuje użytkownika i czyści sesję
   */
  signOut(): Promise<void>;

  /**
   * Wysyła email z linkiem do resetowania hasła
   * @param email - Adres email użytkownika
   * @throws AuthError jeśli wysłanie nie powiedzie się
   */
  resetPasswordRequest(email: string): Promise<void>;

  /**
   * Aktualizuje hasło użytkownika (wymaga ważnej sesji)
   * @param newPassword - Nowe hasło (min. 8 znaków)
   * @throws AuthError jeśli aktualizacja nie powiedzie się
   */
  updatePassword(newPassword: string): Promise<void>;

  /**
   * Pobiera aktualną sesję użytkownika
   * @returns Session object lub null jeśli niezalogowany
   */
  getSession(): Promise<Session | null>;

  /**
   * Odświeża wygasającą sesję używając refresh token
   * @returns Promise z nową sesją
   * @throws AuthError jeśli refresh nie powiedzie się
   */
  refreshSession(): Promise<Session>;
}

interface AuthResult {
  user: User;
  session: Session | null;
}

interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  createdAt: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

class AuthError extends Error {
  code: string;
  constructor(message: string, code: string);
}
```

### 13.2. Middleware Contracts

```typescript
/**
 * Context.locals types rozszerzone o auth
 */
declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      userId?: string;
      userEmail?: string;
      user?: User;
    }
  }
}

/**
 * Page Auth Middleware
 * Sprawdza autentykację dla protected routes
 */
export const pageAuthMiddleware: MiddlewareHandler;

/**
 * API Auth Middleware
 * Weryfikuje JWT dla /api/* routes
 */
export const authMiddleware: MiddlewareHandler;
```

### 13.3. Server Auth Helpers Contract

```typescript
/**
 * Pobiera zalogowanego użytkownika (server-side)
 * @param Astro - Astro global object
 * @returns User lub null
 */
export function getAuthenticatedUser(Astro: AstroGlobal): Promise<User | null>;

/**
 * Wymusza autentykację - przekierowuje jeśli brak sesji
 * @param Astro - Astro global object
 * @returns User (zawsze, bo inaczej redirect)
 * @throws Astro.redirect jeśli niezalogowany
 */
export function requireAuth(Astro: AstroGlobal): Promise<User>;
```

---

## 14. ZGODNOŚĆ Z ISTNIEJĄCĄ APLIKACJĄ

### 14.1. Integracja z obecnym API

**Obecne endpointy:**
- `POST /api/generations` - generowanie fiszek
- `POST /api/flashcards/batch` - zapis fiszek

**Zmiany wymagane:**
- ✅ Już chronione przez `authMiddleware`
- ✅ Już używają `context.locals.userId`
- ✅ Już mają RLS policies w bazie

**Bez zmian** - API będzie działać tak samo, ale teraz:
- W dev mode: mock userId (już działa)
- W production: prawdziwy userId z JWT

### 14.2. Kompatybilność z GenerateFlashcardsView

**Obecny komponent:** `src/components/generate/GenerateFlashcardsView.tsx`

**Integracja:**
```tsx
// GenerateFlashcardsView.tsx - bez zmian!
// API client automatycznie doda Authorization header z localStorage

const handleGenerate = async () => {
  // Ten kod już działa - AuthService zadbał o token w localStorage
  const result = await generateFlashcards({
    source_text: text,
    model: selectedModel,
  });

  // ...reszta logiki bez zmian
};
```

**SessionProvider wrapper (opcjonalnie):**
```astro
---
// src/pages/generate.astro
import { SessionProvider } from '@/components/auth/SessionProvider';

const user = await requireAuth(Astro);
const session = await Astro.locals.supabase.auth.getSession();
---

<Layout title="Generuj" user={user}>
  <SessionProvider initialSession={session.data.session} client:only="react">
    <GenerateFlashcardsView client:load />
  </SessionProvider>
</Layout>
```

### 14.3. Database - bez zmian

**Obecne tabele:**
- `generations` - ma `user_id` FK do `auth.users` ✅
- `flashcards` - ma `user_id` FK do `auth.users` ✅
- `generation_error_logs` - ma `user_id` FK do `auth.users` ✅

**RLS Policies:**
- ✅ Już skonfigurowane dla authenticated i anon users
- ✅ Sprawdzają `auth.uid() = user_id`

**Tabela `auth.users`:**
- ✅ Zarządzana przez Supabase Auth
- ✅ Automatycznie tworzona podczas `signUp()`

**Bez migracji** - wszystko już gotowe!

---

## 15. PODSUMOWANIE I KLUCZOWE WNIOSKI

### 15.1. Co zostało zaprojektowane

1. **Kompletny system autentykacji** z Supabase Auth
2. **UI komponenty** (AuthPanel, UserMenu, SessionProvider, Navigation)
3. **Server-side middleware** dla protected pages i API routes
4. **Client-side serwis** (AuthService) jako wrapper dla Supabase
5. **Email verification flow** z callback handling
6. **Password reset flow** z tokenem w URL
7. **Token auto-refresh** mechanism
8. **Comprehensive error handling** dla wszystkich edge cases
9. **Security best practices** (rate limiting, CSRF, HTTPS)
10. **RODO compliance** (Terms checkbox, data deletion rights)

### 15.2. Kluczowe decyzje architektoniczne

**1. Supabase Auth zamiast custom auth:**
- ✅ Mniej kodu do utrzymania
- ✅ Battle-tested security
- ✅ Built-in email delivery
- ✅ Automatic RLS policies

**2. localStorage dla tokenów (MVP):**
- ✅ Prostsza implementacja
- ✅ Wystarczająca security dla MVP
- ⚠️ XSS risk (mitigation: CSP headers)
- 🔮 Przyszłość: HTTPOnly cookies

**3. Middleware-based protection:**
- ✅ Centralized auth logic
- ✅ Automatic redirects
- ✅ No repeated code w pages

**4. Separate auth dla API vs Pages:**
- `authMiddleware` → `/api/*` (JWT verification)
- `pageAuthMiddleware` → protected pages (session check)

**5. React dla interactive, Astro dla static:**
- AuthPanel → React (forms, validation, state)
- Login pages → Astro (SSR, SEO)
- Navigation → Astro (SSR) + React (UserMenu dropdown)

### 15.3. Potencjalne ryzyka i mitigation

| Ryzyko | Mitigation |
|--------|-----------|
| XSS attack → token stolen | CSP headers, input sanitization |
| Email delivery issues | Fallback SMTP provider, monitoring |
| Token refresh fails | Graceful fallback to login |
| Supabase downtime | Status page monitoring, komunikat dla users |
| Rate limit bypass | IP-based limiting + CAPTCHA (przyszłość) |

### 15.4. Następne kroki po implementacji

**Short-term (1-2 tygodnie):**
1. Implementacja według planu (6-9 dni)
2. Manualne testy wszystkich flow
3. Deploy na staging
4. Alfa testy z real users

**Mid-term (1-3 miesiące):**
1. Analytics integration (track auth events)
2. Social login (Google, GitHub)
3. MFA/2FA (Supabase wspiera)
4. HTTPOnly cookies dla tokenów

**Long-term (3-6 miesięcy):**
1. Passwordless login (magic links)
2. Session management dashboard (view active sessions)
3. Account deletion flow (RODO)
4. Advanced security (device fingerprinting, anomaly detection)

---

## ZAŁĄCZNIKI

### A. Przykładowe komponenty Shadcn/ui do użycia

Wymagane komponenty (już dostępne w projekcie):
- `Button` ✅
- `Input` ✅
- `Label` ✅
- `Card`, `CardHeader`, `CardTitle`, `CardContent` ✅
- `Avatar`, `AvatarImage`, `AvatarFallback` ✅
- `Dialog` ✅
- `Toast`, `Toaster` ✅

Do dodania:
- `Checkbox` (dla Terms agreement)
- `Alert`, `AlertTitle`, `AlertDescription` (dla messages)
- `DropdownMenu` (dla UserMenu)

### B. Environment Variables Template

```bash
# .env.example
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter (już istnieje)
OPENROUTER_API_KEY=your-openrouter-key

# Environment
NODE_ENV=development  # development | production

# Optional: Custom SMTP (jeśli nie używasz Supabase email)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

### C. Supabase Email Templates (Polski)

**Uwaga MVP:** W MVP używamy tylko template "Reset Password". Template "Confirm Signup" jest zachowany jako dokumentacja dla przyszłych rozszerzeń, gdy email verification zostanie włączona.

**Reset Password (MVP - wymagany):**
```html
<h2>Zresetuj hasło</h2>

<p>Witaj!</p>

<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w 10x-cards.</p>

<p>Kliknij poniższy link, aby ustawić nowe hasło:</p>

<p><a href="{{ .ConfirmationURL }}">Zresetuj hasło</a></p>

<p>Jeśli nie prosiłeś o reset hasła, zignoruj tego maila. Twoje hasło pozostanie bez zmian.</p>

<p>Link jest ważny przez 1 godzinę.</p>

<hr>
<p style="font-size: 12px; color: #666;">10x-cards - AI-powered flashcards</p>
```

---

### D. Email Verification Template (Przyszłe rozszerzenie)

**Confirm Signup (nie używany w MVP - opcjonalny dla przyszłości):**
```html
<h2>Potwierdź swój adres email</h2>

<p>Witaj!</p>

<p>Dziękujemy za rejestrację w 10x-cards. Kliknij poniższy link, aby potwierdzić swój adres email i aktywować konto:</p>

<p><a href="{{ .ConfirmationURL }}">Potwierdź email</a></p>

<p>Jeśli nie zakładałeś konta w 10x-cards, zignoruj tego maila.</p>

<p>Link jest ważny przez 24 godziny.</p>

<hr>
<p style="font-size: 12px; color: #666;">10x-cards - AI-powered flashcards</p>
```

**Kiedy włączyć email verification:**
- Gdy aplikacja zbierze więcej użytkowników i będzie problem z fake accounts
- Gdy będzie potrzebne dodatkowe zabezpieczenie
- Wystarczy zmienić w Supabase: `Email Confirmation: DISABLED` → `ENABLED`
- Kod jest przygotowany - strona `/auth/callback` obsługuje `type=signup`
- Dodać stronę `/verify-email.astro` z instrukcją dla użytkownika

---

## 16. PODSUMOWANIE ZMIAN W STOSUNKU DO PIERWOTNEJ WERSJI

### 16.1. Decyzje dostosowane do PRD

**Zmiana #1: Email Verification WYŁĄCZONA (zgodnie z US-001)**
- PRD US-001: "Użytkownik otrzymuje potwierdzenie pomyślnej rejestracji i zostaje zalogowany"
- Literalna interpretacja: natychmiastowe logowanie bez weryfikacji email
- **Decyzja:** Email verification DISABLED w MVP dla zgodności z PRD
- **Przyszłość:** Zachowana implementacja callback flow jako opcja na przyszłość

**Zmiana #2: Password Reset ZACHOWANY (praktyczna decyzja)**
- PRD: Brak wzmianki o reset hasła w US-001 i US-002
- **Decyzja:** Zachować password reset w MVP jako podstawową funkcjonalność
- **Uzasadnienie:** Bez możliwości resetu hasła użytkownicy tracą dostęp do kont

**Zmiana #3: Uproszczony flow rejestracji**
- Przed: Rejestracja → Email verification → Klik w link → Login → /generate
- Teraz: Rejestracja → Auto-login → /generate
- **Korzyść:** Mniej friction, szybszy onboarding, zgodność z US-001

### 16.2. Zachowane elementy architektury

- ✅ Middleware dla protected pages i API routes
- ✅ AuthService jako wrapper dla Supabase Auth
- ✅ SessionProvider dla zarządzania sesją
- ✅ Token auto-refresh mechanism
- ✅ UserMenu i Navigation components
- ✅ Password reset flow (forgot → email → reset)
- ✅ Protected routes z automatycznym redirect
- ✅ Wszystkie security best practices

### 16.3. Opcjonalne przyszłe rozszerzenia

1. **Email Verification** - włączyć przez Supabase Dashboard + dodać `/verify-email` page
2. **Social Auth** (Google, GitHub) - wykorzystać istniejący `/auth/callback`
3. **MFA/2FA** - Supabase wspiera
4. **HTTPOnly cookies** - zamiast localStorage dla lepszego security
5. **Magic Links** - passwordless login

---

**KONIEC SPECYFIKACJI**

*Dokument przygotowany dla zespołu deweloperskiego 10x-cards.*

*Wersja: 1.1 (zaktualizowana zgodnie z analizą sprzeczności z PRD)*

*Wszystkie decyzje architektoniczne są zgodne z wymaganiami PRD (US-001, US-002) oraz stack technologicznym (Astro 5, React 19, Supabase, TypeScript).*

*Kluczowe zmiany w wersji 1.1:*
- *Email verification WYŁĄCZONA dla zgodności z literalnym odczytaniem US-001*
- *Password reset ZACHOWANY jako praktyczna funkcjonalność MVP*
- *Auto-login natychmiast po rejestracji (zero friction onboarding)*

*Specyfikacja jest gotowa do implementacji i może służyć jako szczegółowy plan działania.*
