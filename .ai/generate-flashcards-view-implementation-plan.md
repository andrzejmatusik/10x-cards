# Plan implementacji widoku Generowania Fiszek

## 1. Przegląd

Widok generowania fiszek to główny widok aplikacji 10x-cards, który umożliwia użytkownikom automatyczne tworzenie fiszek edukacyjnych przy wykorzystaniu modeli AI. Użytkownik wkleja tekst (1000-10000 znaków), który jest wysyłany do API LLM. Model generuje propozycje fiszek w formie pytań i odpowiedzi. Użytkownik może następnie przeglądać propozycje, akceptować je bez zmian, edytować przed zapisem lub całkowicie odrzucić. Po dokonaniu wyboru, zaakceptowane fiszki są zapisywane zbiorczo do bazy danych poprzez wywołanie API.

## 2. Routing widoku

**Ścieżka:** `/generate`

**Wymagania:**
- Widok wymaga uwierzytelnienia (użytkownik musi być zalogowany)
- Przekierowanie do `/login` dla niezalogowanych użytkowników
- Po zapisie fiszek opcjonalne przekierowanie do `/flashcards`

## 3. Struktura komponentów

Widok składa się z następującej hierarchii komponentów:

```
GenerateFlashcardsView (strona Astro lub główny komponent React)
├── TextInputSection (React)
│   ├── Textarea (Shadcn/ui)
│   ├── CharacterCounter (React)
│   ├── ValidationMessage (React)
│   └── Button "Generuj fiszki" (Shadcn/ui)
│
├── LoadingSkeleton (React - warunkowe)
│   └── Skeleton components (Shadcn/ui)
│
├── GeneratedFlashcardsList (React - warunkowe)
│   ├── FlashcardProposalItem[] (React - mapowane)
│   │   ├── Card (Shadcn/ui)
│   │   ├── Wyświetlanie front/back
│   │   └── Action Buttons (Akceptuj/Edytuj/Odrzuć)
│   └── EmptyState (gdy brak propozycji)
│
├── FlashcardEditModal (React - warunkowe)
│   ├── Dialog (Shadcn/ui)
│   ├── Input fields (front/back)
│   ├── Validation messages
│   └── Save/Cancel buttons
│
└── ActionButtons (React - warunkowe)
    ├── Button "Zapisz zaakceptowane (X)"
    └── Button "Zapisz wszystkie (Y)"
```

## 4. Szczegóły komponentów

### 4.1. GenerateFlashcardsView

**Opis komponentu:**
Główny kontenerowy komponent widoku, który zarządza całym stanem generowania i zapisu fiszek. Koordynuje działanie wszystkich podkomponentów i obsługuje komunikację z API.

**Główne elementy:**
- Kontener layout z responsywnym paddingiem
- Nagłówek sekcji "Generuj fiszki z AI"
- Wszystkie podkomponenty wymienione w strukturze
- Toast notifications dla komunikatów sukcesu/błędów

**Obsługiwane interakcje:**
- Zarządzanie globalnym stanem widoku
- Wywołania API (generowanie i zapis)
- Obsługa błędów i wyświetlanie komunikatów

**Obsługiwana walidacja:**
- Delegowana do podkomponentów

**Typy:**
- GenerateViewState (stan widoku)
- CreateGenerationCommand (API request)
- CreateGenerationResponse (API response)
- CreateBatchFlashcardsCommand (API request)
- CreateBatchFlashcardsResponse (API response)

**Propsy:**
Brak - główny widok, nie przyjmuje propsów

---

### 4.2. TextInputSection

**Opis komponentu:**
Sekcja formularza zawierająca pole tekstowe do wprowadzenia materiału źródłowego oraz przycisk generowania. Komponent odpowiada za walidację długości tekstu i komunikację o stanie walidacji.

**Główne elementy:**
- `<form>` element z onSubmit handler
- Textarea (Shadcn/ui) - wieloliniowe pole tekstowe
- CharacterCounter - licznik znaków "X / 10000"
- ValidationMessage - komunikat walidacji pod textarea
- Button "Generuj fiszki" (Shadcn/ui) z ikoną
- Opcjonalny opis "Wklej tekst (1000-10000 znaków) do wygenerowania fiszek"

**Obsługiwane interakcje:**
- `onChange` textarea - aktualizacja tekstu i walidacja
- `onSubmit` form / `onClick` button - wywołanie generowania
- Automatyczna walidacja w czasie rzeczywistym

**Obsługiwana walidacja:**
- **Długość tekstu >= 1000 znaków:**
  - Jeśli nie: komunikat "Tekst jest za krótki. Minimum 1000 znaków. (aktualnie: X)"
  - Przycisk wyłączony
- **Długość tekstu <= 10000 znaków:**
  - Jeśli nie: komunikat "Tekst jest za długi. Maksimum 10000 znaków. (aktualnie: X)"
  - Przycisk wyłączony
- **Tekst w zakresie:**
  - Komunikat sukcesu: "Tekst gotowy do generowania (X znaków)"
  - Przycisk aktywny
- Przycisk również wyłączony gdy `isLoading === true`

**Typy:**
- `TextInputValidation` - wynik walidacji
- `CreateGenerationCommand` - dla przekazania do API

**Propsy:**
```typescript
interface TextInputSectionProps {
  value: string;
  onChange: (text: string) => void;
  onGenerate: (text: string) => void;
  isLoading: boolean;
  error?: string | null;
}
```

---

### 4.3. CharacterCounter

**Opis komponentu:**
Prosty komponent wyświetlający licznik znaków w formacie "X / 10000". Zmienia kolor w zależności od stanu walidacji.

**Główne elementy:**
- `<span>` lub `<div>` z tekstem licznika

**Obsługiwane interakcje:**
Brak - komponent prezentacyjny

**Obsługiwana walidacja:**
Wyświetlanie (styling):
- Kolor czerwony gdy > 10000
- Kolor pomarańczowy gdy < 1000
- Kolor zielony gdy w zakresie 1000-10000

**Typy:**
Brak specyficznych typów

**Propsy:**
```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
  isValid: boolean;
}
```

---

### 4.4. ValidationMessage

**Opis komponentu:**
Komponent wyświetlający komunikat walidacji tekstu. Pokazuje błędy lub potwierdzenie poprawności.

**Główne elementy:**
- `<p>` element z odpowiednim stylingiem (kolory, ikony)

**Obsługiwane interakcje:**
Brak - komponent prezentacyjny

**Obsługiwana walidacja:**
Wyświetlanie komunikatu przekazanego przez rodzica

**Typy:**
Brak specyficznych typów

**Propsy:**
```typescript
interface ValidationMessageProps {
  message: string | null;
  type: 'error' | 'success' | 'info';
}
```

---

### 4.5. LoadingSkeleton

**Opis komponentu:**
Komponent placeholder wyświetlany podczas ładowania propozycji fiszek z API. Pokazuje 5-10 szkieletowych kart.

**Główne elementy:**
- Lista Skeleton komponentów (Shadcn/ui)
- Każdy skeleton imituje strukturę FlashcardProposalItem
- Animacja pulse

**Obsługiwane interakcje:**
Brak - komponent prezentacyjny

**Obsługiwana walidacja:**
Brak

**Typy:**
Brak specyficznych typów

**Propsy:**
```typescript
interface LoadingSkeletonProps {
  count?: number; // domyślnie 5
}
```

---

### 4.6. GeneratedFlashcardsList

**Opis komponentu:**
Lista wygenerowanych propozycji fiszek. Wyświetla FlashcardProposalItem dla każdej propozycji lub EmptyState gdy brak propozycji.

**Główne elementy:**
- Nagłówek "Wygenerowane fiszki (X)"
- Podsumowanie: "Zaakceptowane: X | Edytowane: Y | Odrzucone: Z"
- Lista FlashcardProposalItem (mapowana)
- EmptyState gdy proposals.length === 0

**Obsługiwane interakcje:**
- Delegowanie akcji (accept/edit/reject) do FlashcardProposalItem
- Przekazywanie callbacków z rodzica do dzieci

**Obsługiwana walidacja:**
Brak bezpośredniej walidacji

**Typy:**
- `FlashcardProposalState[]` - lista propozycji ze stanami
- `ProposedFlashcard` - pojedyncza propozycja

**Propsy:**
```typescript
interface GeneratedFlashcardsListProps {
  proposals: FlashcardProposalState[];
  onAccept: (index: number) => void;
  onEdit: (index: number) => void;
  onReject: (index: number) => void;
}
```

---

### 4.7. FlashcardProposalItem

**Opis komponentu:**
Pojedyncza karta propozycji fiszki z wyświetleniem treści (front/back) oraz przyciskami akcji. Zmienia wygląd w zależności od stanu (pending/accepted/edited/rejected).

**Główne elementy:**
- Card (Shadcn/ui) jako kontener
- Badge ze statusem (opcjonalnie)
- Sekcja "Przód": wyświetlenie `front` text
- Sekcja "Tył": wyświetlenie `back` text
- Trzy przyciski akcji:
  - Button "Akceptuj" (✓) - wariant success
  - Button "Edytuj" (✏) - wariant default
  - Button "Odrzuć" (✗) - wariant destructive

**Obsługiwane interakcje:**
- `onClick` Akceptuj - wywołanie `onAccept()`
- `onClick` Edytuj - wywołanie `onEdit()`
- `onClick` Odrzuć - wywołanie `onReject()`

**Obsługiwana walidacja:**
Brak bezpośredniej walidacji (walidacja w modalu edycji)

**Typy:**
- `FlashcardProposalState` - stan propozycji
- `FlashcardActionType` - typ akcji

**Propsy:**
```typescript
interface FlashcardProposalItemProps {
  proposal: FlashcardProposalState;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}
```

**Warianty wizualne według statusu:**
- `pending`: domyślny border, pełna opacity
- `accepted`: zielony border (border-green-500), lekkie tło (bg-green-50)
- `edited`: niebieski border (border-blue-500), lekkie tło (bg-blue-50)
- `rejected`: szary border, opacity 0.5, przekreślenie

---

### 4.8. FlashcardEditModal

**Opis komponentu:**
Modal dialog do edycji treści fiszki przed jej zaakceptowaniem. Umożliwia modyfikację pól front i back z walidacją długości.

**Główne elementy:**
- Dialog (Shadcn/ui) jako kontener modalu
- DialogHeader z tytułem "Edytuj fiszkę"
- Formularz z dwoma polami:
  - Label "Przód fiszki"
  - Textarea/Input dla front (max 200 znaków)
  - Licznik znaków "X / 200"
  - Komunikat błędu (jeśli występuje)
  - Label "Tył fiszki"
  - Textarea dla back (max 500 znaków)
  - Licznik znaków "X / 500"
  - Komunikat błędu (jeśli występuje)
- DialogFooter z przyciskami:
  - Button "Anuluj" - wariant outline
  - Button "Zapisz" - wariant primary

**Obsługiwane interakcje:**
- `onChange` inputs - aktualizacja wartości i walidacja
- `onClick` Zapisz - wywołanie `onSave()` z danymi
- `onClick` Anuluj / close icon - wywołanie `onCancel()`
- ESC key - zamknięcie modalu

**Obsługiwana walidacja:**
- **Front:**
  - Required: "Przód fiszki jest wymagany"
  - Max 200 znaków: "Maksymalna długość: 200 znaków (aktualnie: X)"
  - Realtime validation
- **Back:**
  - Required: "Tył fiszki jest wymagany"
  - Max 500 znaków: "Maksymalna długość: 500 znaków (aktualnie: X)"
  - Realtime validation
- Przycisk "Zapisz" wyłączony gdy walidacja nie przechodzi lub żadne pole nie zostało zmienione

**Typy:**
- `ProposedFlashcard` - dane fiszki do edycji
- `FlashcardValidationErrors` - błędy walidacji

**Propsy:**
```typescript
interface FlashcardEditModalProps {
  isOpen: boolean;
  flashcard: ProposedFlashcard;
  onSave: (data: { front: string; back: string }) => void;
  onCancel: () => void;
}
```

---

### 4.9. ActionButtons

**Opis komponentu:**
Sekcja z dwoma przyciskami akcji do zapisu fiszek. Pokazuje liczby fiszek do zapisu i zarządza stanem ładowania podczas zapisu.

**Główne elementy:**
- Kontener flex z dwoma przyciskami:
  - Button "Zapisz zaakceptowane (X)" - wariant primary
  - Button "Zapisz wszystkie (Y)" - wariant secondary
- Opcjonalny opis akcji pod przyciskami

**Obsługiwane interakcje:**
- `onClick` "Zapisz zaakceptowane" - wywołanie `onSaveAccepted()`
- `onClick` "Zapisz wszystkie" - wywołanie `onSaveAll()`

**Obsługiwana walidacja:**
Przyciski wyłączone gdy:
- `isSaving === true` (zapis w trakcie)
- Dla "Zapisz zaakceptowane": `acceptedCount === 0`
- Dla "Zapisz wszystkie": `totalCount === 0`

**Typy:**
Brak specyficznych typów (tylko liczby)

**Propsy:**
```typescript
interface ActionButtonsProps {
  acceptedCount: number;
  totalCount: number;
  onSaveAccepted: () => void;
  onSaveAll: () => void;
  isSaving: boolean;
}
```

---

### 4.10. EmptyState

**Opis komponentu:**
Komponent wyświetlany gdy model nie wygenerował żadnych propozycji fiszek.

**Główne elementy:**
- Ikona (np. empty box)
- Nagłówek "Brak propozycji fiszek"
- Opis "Model nie wygenerował żadnych fiszek. Spróbuj z dłuższym lub bardziej treściwym tekstem."
- Button "Spróbuj ponownie" - powrót do formularza

**Obsługiwane interakcje:**
- `onClick` "Spróbuj ponownie" - focus na textarea

**Obsługiwana walidacja:**
Brak

**Typy:**
Brak

**Propsy:**
```typescript
interface EmptyStateProps {
  onRetry: () => void;
}
```

---

## 5. Typy

### 5.1. Typy z API (zdefiniowane w src/types.ts)

Wykorzystujemy następujące typy z pliku `src/types.ts`:

**CreateGenerationCommand** - Request do POST /api/generations:
```typescript
interface CreateGenerationCommand {
  source_text: string; // min 1000, max 10000 characters
  model: string; // e.g., "openai/gpt-4"
}
```

**CreateGenerationResponse** - Response z POST /api/generations:
```typescript
interface CreateGenerationResponse extends GenerationDTO {
  proposed_flashcards: ProposedFlashcard[];
}
```

**ProposedFlashcard** - Pojedyncza propozycja fiszki z API:
```typescript
interface ProposedFlashcard {
  front: string;
  back: string;
}
```

**CreateBatchFlashcardsCommand** - Request do POST /api/flashcards/batch:
```typescript
interface CreateBatchFlashcardsCommand {
  generation_id: number;
  flashcards: BatchFlashcardItem[];
}
```

**BatchFlashcardItem** - Element w tablicy flashcards:
```typescript
interface BatchFlashcardItem {
  front: string; // max 200 characters
  back: string; // max 500 characters
  source: "ai-full" | "ai-edited";
}
```

**CreateBatchFlashcardsResponse** - Response z POST /api/flashcards/batch:
```typescript
interface CreateBatchFlashcardsResponse {
  created_count: number;
  flashcards: FlashcardDTO[];
}
```

**Constraints** - Stałe walidacyjne:
```typescript
const GenerationConstraints = {
  SOURCE_TEXT_MIN_LENGTH: 1000,
  SOURCE_TEXT_MAX_LENGTH: 10000,
} as const;

const FlashcardConstraints = {
  FRONT_MAX_LENGTH: 200,
  BACK_MAX_LENGTH: 500,
} as const;
```

### 5.2. Nowe typy ViewModel (do utworzenia)

**FlashcardActionType** - Typ akcji wykonanej na propozycji:
```typescript
type FlashcardActionType = 'pending' | 'accepted' | 'edited' | 'rejected';
```
- `pending` - użytkownik jeszcze nie podjął decyzji
- `accepted` - zaakceptowana bez zmian (source: 'ai-full')
- `edited` - zaakceptowana po edycji (source: 'ai-edited')
- `rejected` - odrzucona, nie będzie zapisana

**FlashcardProposalState** - Stan pojedynczej propozycji w UI:
```typescript
interface FlashcardProposalState {
  original: ProposedFlashcard; // oryginalna propozycja z API (niemodyfikowana)
  current: ProposedFlashcard; // aktualna wersja (może być edytowana)
  action: FlashcardActionType; // co użytkownik zdecydował
  index: number; // indeks w oryginalnej tablicy (dla identyfikacji)
}
```

**GenerateViewState** - Główny stan widoku:
```typescript
interface GenerateViewState {
  // Sekcja wprowadzania tekstu
  sourceText: string; // tekst wklejony przez użytkownika
  textLength: number; // długość tekstu (cache dla optymalizacji)

  // Proces generowania
  isGenerating: boolean; // czy trwa wywołanie API generowania
  generationId: number | null; // ID utworzonej generacji
  generationError: string | null; // błąd podczas generowania

  // Propozycje fiszek
  proposals: FlashcardProposalState[]; // lista propozycji ze stanami

  // Proces zapisu
  isSaving: boolean; // czy trwa zapis do API
  saveError: string | null; // błąd podczas zapisu

  // Modal edycji
  editingIndex: number | null; // indeks edytowanej fiszki (null = modal zamknięty)
}
```

**TextInputValidation** - Wynik walidacji tekstu wejściowego:
```typescript
interface TextInputValidation {
  isValid: boolean; // czy tekst spełnia wymagania (1000-10000)
  isTooShort: boolean; // czy tekst < 1000
  isTooLong: boolean; // czy tekst > 10000
  message: string | null; // komunikat do wyświetlenia użytkownikowi
  messageType: 'error' | 'success' | 'info'; // typ komunikatu (dla stylowania)
}
```

**FlashcardValidationErrors** - Błędy walidacji fiszki w modalu edycji:
```typescript
interface FlashcardValidationErrors {
  front?: string; // błąd dla pola front (jeśli występuje)
  back?: string; // błąd dla pola back (jeśli występuje)
}
```

**FlashcardValidationResult** - Wynik walidacji fiszki:
```typescript
interface FlashcardValidationResult {
  isValid: boolean; // czy wszystkie pola są poprawne
  errors: FlashcardValidationErrors; // obiekt z błędami (pusty gdy isValid=true)
}
```

---

## 6. Zarządzanie stanem

### 6.1. Architektura stanu

Stan widoku będzie zarządzany za pomocą **custom hooka** `useGenerateFlashcards`, który enkapsuluje całą logikę biznesową widoku. Hook ten będzie wykorzystywany w głównym komponencie GenerateFlashcardsView.

### 6.2. Custom hook: useGenerateFlashcards

**Lokalizacja:** `src/hooks/useGenerateFlashcards.ts`

**Cel:** Centralne zarządzanie stanem widoku generowania fiszek, obsługa wywołań API i logiki biznesowej.

**Stan wewnętrzny:**
```typescript
const [state, setState] = useState<GenerateViewState>({
  sourceText: '',
  textLength: 0,
  isGenerating: false,
  generationId: null,
  generationError: null,
  proposals: [],
  isSaving: false,
  saveError: null,
  editingIndex: null,
});
```

**Zwracana wartość:**
```typescript
interface UseGenerateFlashcardsReturn {
  // Stan
  state: GenerateViewState;

  // Computed values
  acceptedCount: number;
  editedCount: number;
  rejectedCount: number;

  // Metody zarządzania tekstem
  handleTextChange: (text: string) => void;

  // Metody generowania
  handleGenerate: () => Promise<void>;
  resetGeneration: () => void;

  // Metody akcji na fiszkach
  handleAccept: (index: number) => void;
  handleEdit: (index: number) => void;
  handleReject: (index: number) => void;
  handleSaveEdit: (data: { front: string; back: string }) => void;
  handleCancelEdit: () => void;

  // Metody zapisu
  handleSaveAccepted: () => Promise<void>;
  handleSaveAll: () => Promise<void>;
}
```

**Główne metody:**

**handleTextChange(text: string)**
- Aktualizuje `sourceText` i `textLength`
- Czyści błędy generowania jeśli tekst się zmienił

**handleGenerate()**
- Waliduje długość tekstu (1000-10000)
- Ustawia `isGenerating = true`, czyści `generationError`
- Wywołuje POST /api/generations z `CreateGenerationCommand`
- W przypadku sukcesu:
  - Zapisuje `generationId` z response
  - Przekształca `proposed_flashcards` w `FlashcardProposalState[]` (action: 'pending')
  - Ustawia `proposals`
- W przypadku błędu:
  - Parsuje kod błędu (400/422/429/401) i ustawia odpowiedni `generationError`
  - Wyświetla toast error
- Zawsze ustawia `isGenerating = false` na końcu

**resetGeneration()**
- Resetuje stan do wartości początkowych (czyści propozycje, sourceText, itp.)

**handleAccept(index: number)**
- Znajduje propozycję o danym indeksie
- Zmienia jej `action` na 'accepted'
- Upewnia się, że `current === original` (nie ma edycji)

**handleEdit(index: number)**
- Ustawia `editingIndex = index`
- Otwiera modal edycji

**handleSaveEdit(data: { front: string; back: string })**
- Aktualizuje `proposals[editingIndex].current` z nowymi danymi
- Ustawia `action` na 'edited'
- Zamyka modal (`editingIndex = null`)

**handleCancelEdit()**
- Zamyka modal bez zmian (`editingIndex = null`)

**handleReject(index: number)**
- Zmienia `action` propozycji na 'rejected'

**handleSaveAccepted()**
- Filtruje propozycje: tylko te z action 'accepted' lub 'edited'
- Przygotowuje `CreateBatchFlashcardsCommand`:
  - `generation_id: generationId`
  - `flashcards`: mapuje propozycje na `BatchFlashcardItem` (source określony na podstawie action)
- Ustawia `isSaving = true`, czyści `saveError`
- Wywołuje POST /api/flashcards/batch
- W przypadku sukcesu:
  - Wyświetla toast sukcesu: "Zapisano {created_count} fiszek"
  - Resetuje stan (wywołuje `resetGeneration()`)
  - Opcjonalnie: nawigacja do /flashcards
- W przypadku błędu:
  - Parsuje kod błędu i ustawia `saveError`
  - Wyświetla toast error
- Zawsze ustawia `isSaving = false`

**handleSaveAll()**
- Analogicznie do `handleSaveAccepted`, ale bez filtrowania (wszystkie propozycje)
- Ustawia `action` wszystkich pending propozycji na 'accepted' przed zapisem

### 6.3. Custom hook: useTextValidation

**Lokalizacja:** `src/hooks/useTextValidation.ts`

**Cel:** Walidacja długości tekstu wejściowego w czasie rzeczywistym.

**Sygnatura:**
```typescript
function useTextValidation(text: string): TextInputValidation
```

**Implementacja:**
```typescript
import { GenerationConstraints } from '@/types';

export function useTextValidation(text: string): TextInputValidation {
  const length = text.length;
  const min = GenerationConstraints.SOURCE_TEXT_MIN_LENGTH; // 1000
  const max = GenerationConstraints.SOURCE_TEXT_MAX_LENGTH; // 10000

  const isTooShort = length > 0 && length < min;
  const isTooLong = length > max;
  const isValid = length >= min && length <= max;

  let message: string | null = null;
  let messageType: 'error' | 'success' | 'info' = 'info';

  if (isTooShort) {
    message = `Tekst jest za krótki. Minimum ${min} znaków. (aktualnie: ${length})`;
    messageType = 'error';
  } else if (isTooLong) {
    message = `Tekst jest za długi. Maksimum ${max} znaków. (aktualnie: ${length})`;
    messageType = 'error';
  } else if (isValid) {
    message = `Tekst gotowy do generowania (${length} znaków)`;
    messageType = 'success';
  } else if (length === 0) {
    message = `Wklej tekst do wygenerowania fiszek (${min}-${max} znaków)`;
    messageType = 'info';
  }

  return { isValid, isTooShort, isTooLong, message, messageType };
}
```

### 6.4. Custom hook: useFlashcardValidation

**Lokalizacja:** `src/hooks/useFlashcardValidation.ts`

**Cel:** Walidacja pól front/back podczas edycji fiszki.

**Sygnatura:**
```typescript
function useFlashcardValidation(front: string, back: string): FlashcardValidationResult
```

**Implementacja:**
```typescript
import { FlashcardConstraints } from '@/types';

export function useFlashcardValidation(
  front: string,
  back: string
): FlashcardValidationResult {
  const maxFront = FlashcardConstraints.FRONT_MAX_LENGTH; // 200
  const maxBack = FlashcardConstraints.BACK_MAX_LENGTH; // 500

  const errors: FlashcardValidationErrors = {};

  // Walidacja front
  if (!front.trim()) {
    errors.front = 'Przód fiszki jest wymagany';
  } else if (front.length > maxFront) {
    errors.front = `Maksymalna długość: ${maxFront} znaków (aktualnie: ${front.length})`;
  }

  // Walidacja back
  if (!back.trim()) {
    errors.back = 'Tył fiszki jest wymagany';
  } else if (back.length > maxBack) {
    errors.back = `Maksymalna długość: ${maxBack} znaków (aktualnie: ${back.length})`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

### 6.5. Persystencja stanu (localStorage)

**Opcjonalnie:** Implementacja zapisywania stanu do localStorage aby zapobiec utracie danych po odświeżeniu strony.

**Klucz:** `generate-flashcards-draft`

**Zapisywane dane:**
```typescript
interface GenerateDraft {
  sourceText: string;
  generationId: number | null;
  proposals: FlashcardProposalState[];
  timestamp: number; // do czyszczenia starych draftów
}
```

**Implementacja w useGenerateFlashcards:**
- `useEffect` zapisujący draft po każdej zmianie stanu (debounced)
- Przy montowaniu komponentu: odczyt z localStorage i modal "Odzyskać poprzednią sesję?"

---

## 7. Integracja API

### 7.1. POST /api/generations - Generowanie fiszek

**Endpoint:** `/api/generations`
**Metoda:** POST
**Uwierzytelnienie:** Required (JWT token w Authorization header)

**Request:**
```typescript
// Type
CreateGenerationCommand

// Payload
{
  "source_text": string, // 1000-10000 znaków
  "model": "openai/gpt-4"
}

// Headers
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json"
}
```

**Response (201 Created):**
```typescript
// Type
CreateGenerationResponse

// Payload
{
  "id": number,
  "user_id": string,
  "model": string,
  "generated_count": number,
  "accepted_unedited_count": null,
  "accepted_edited_count": null,
  "source_text_hash": string,
  "source_text_length": number,
  "generation_duration": number, // milisekundy
  "created_at": string,
  "proposed_flashcards": [
    {
      "front": string,
      "back": string
    }
  ]
}
```

**Error Responses:**

**400 Bad Request** - Nieprawidłowa długość tekstu:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Text length not between 1000-10000 characters",
    "details": {
      "field": "source_text",
      "constraint": "length",
      "min": 1000,
      "max": 10000,
      "actual": 500
    }
  }
}
```
- **Obsługa:** Wyświetlić toast "Nieprawidłowa długość tekstu. Wymagane: 1000-10000 znaków."

**422 Unprocessable Entity** - LLM generation failed:
```json
{
  "error": {
    "code": "LLM_GENERATION_FAILED",
    "message": "Failed to generate flashcards from text"
  }
}
```
- **Obsługa:** Wyświetlić toast "Nie udało się wygenerować fiszek. Spróbuj ponownie z innym tekstem."

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Maximum 10 generations per hour exceeded"
  }
}
```
- **Obsługa:** Wyświetlić toast "Przekroczono limit generacji (10 na godzinę). Spróbuj ponownie później."

**401 Unauthorized** - Invalid or missing token:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```
- **Obsługa:** Przekierowanie do /login

**Network Error / Timeout:**
- **Obsługa:** Wyświetlić toast "Sprawdź połączenie z internetem i spróbuj ponownie."

### 7.2. POST /api/flashcards/batch - Zapis fiszek

**Endpoint:** `/api/flashcards/batch`
**Metoda:** POST
**Uwierzytelnienie:** Required (JWT token w Authorization header)

**Request:**
```typescript
// Type
CreateBatchFlashcardsCommand

// Payload
{
  "generation_id": number,
  "flashcards": [
    {
      "front": string, // max 200 znaków
      "back": string,  // max 500 znaków
      "source": "ai-full" | "ai-edited"
    }
  ]
}

// Headers
{
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json"
}
```

**Response (201 Created):**
```typescript
// Type
CreateBatchFlashcardsResponse

// Payload
{
  "created_count": number,
  "flashcards": [
    {
      "id": number,
      "front": string,
      "back": string,
      "source": "ai-full" | "ai-edited",
      "generation_id": number,
      "created_at": string,
      "updated_at": string,
      "user_id": string
    }
  ]
}
```

**Error Responses:**

**400 Bad Request** - Validation errors:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Front text exceeds maximum length of 200 characters",
    "details": {
      "field": "flashcards[0].front",
      "constraint": "max_length",
      "max": 200,
      "actual": 250
    }
  }
}
```
- **Obsługa:** Wyświetlić toast "Niektóre fiszki zawierają nieprawidłowe dane. Sprawdź długość treści."

**404 Not Found** - Generation doesn't exist:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Generation doesn't exist or doesn't belong to user"
  }
}
```
- **Obsługa:** Wyświetlić toast "Generacja nie istnieje lub nie należy do Ciebie." i zresetować stan

**401 Unauthorized** - Invalid token:
- **Obsługa:** Przekierowanie do /login

**Network Error:**
- **Obsługa:** Wyświetlić toast "Nie udało się zapisać fiszek. Spróbuj ponownie."

### 7.3. Implementacja API client

**Lokalizacja:** `src/services/api/flashcards.ts` i `src/services/api/generations.ts`

**Przykładowa implementacja:**
```typescript
// src/services/api/generations.ts
import type { CreateGenerationCommand, CreateGenerationResponse } from '@/types';
import { apiClient } from './client'; // axios instance z interceptorami

export async function generateFlashcards(
  command: CreateGenerationCommand
): Promise<CreateGenerationResponse> {
  const response = await apiClient.post<CreateGenerationResponse>(
    '/api/generations',
    command
  );
  return response.data;
}

// src/services/api/flashcards.ts
import type { CreateBatchFlashcardsCommand, CreateBatchFlashcardsResponse } from '@/types';
import { apiClient } from './client';

export async function saveBatchFlashcards(
  command: CreateBatchFlashcardsCommand
): Promise<CreateBatchFlashcardsResponse> {
  const response = await apiClient.post<CreateBatchFlashcardsResponse>(
    '/api/flashcards/batch',
    command
  );
  return response.data;
}
```

**apiClient** (src/services/api/client.ts):
- Axios instance z baseURL
- Request interceptor: dodawanie Authorization header z JWT token
- Response interceptor: obsługa globalnych błędów (401 -> redirect to login)
- Timeout: 30 sekund dla generowania, 10 sekund dla zapisu

---

## 8. Interakcje użytkownika

### 8.1. Wprowadzenie i walidacja tekstu

**Krok 1:** Użytkownik wchodzi na /generate
- Widzi pusty formularz z textarea i przyciskiem "Generuj fiszki"
- Przycisk jest wyłączony
- Komunikat: "Wklej tekst do wygenerowania fiszek (1000-10000 znaków)"

**Krok 2:** Użytkownik wpisuje/wkleja tekst
- Licznik znaków aktualizuje się na bieżąco: "X / 10000"
- Gdy tekst < 1000: komunikat czerwony "Tekst jest za krótki. Minimum 1000 znaków. (aktualnie: X)"
- Przycisk pozostaje wyłączony

**Krok 3:** Użytkownik osiąga 1000 znaków
- Komunikat zmienia się na zielony: "Tekst gotowy do generowania (1000 znaków)"
- Przycisk "Generuj fiszki" staje się aktywny

**Krok 4:** Użytkownik przekracza 10000 znaków
- Komunikat zmienia się na czerwony: "Tekst jest za długi. Maksimum 10000 znaków. (aktualnie: 10050)"
- Przycisk się wyłącza
- Licznik znaków zmienia kolor na czerwony

### 8.2. Generowanie fiszek

**Krok 1:** Użytkownik klika "Generuj fiszki"
- Przycisk wyłącza się
- Tekst przycisku zmienia się na "Generowanie..."
- Pojawia się LoadingSkeleton (5 placeholder cards) z animacją pulse
- Komunikat: "Generowanie może potrwać do 30 sekund..."

**Krok 2:** Wywołanie API POST /api/generations
- Request z source_text i model
- Authorization header z JWT

**Krok 3a:** Sukces (201 Created)
- LoadingSkeleton znika
- Pojawia się GeneratedFlashcardsList z propozycjami
- Nagłówek: "Wygenerowane fiszki (X)"
- Każda fiszka wyświetla front i back
- Każda fiszka ma 3 przyciski: Akceptuj, Edytuj, Odrzuć
- Pojawia się ActionButtons: "Zapisz zaakceptowane (0)" i "Zapisz wszystkie (X)"

**Krok 3b:** Błąd
- LoadingSkeleton znika
- Pojawia się toast error z komunikatem (zależnie od kodu błędu)
- Formularz pozostaje wypełniony
- Przycisk "Generuj fiszki" staje się aktywny ponownie
- Użytkownik może edytować tekst i spróbować ponownie

**Krok 3c:** Brak propozycji (generated_count = 0)
- LoadingSkeleton znika
- Pojawia się EmptyState: "Model nie wygenerował żadnych fiszek. Spróbuj z dłuższym lub bardziej treściwym tekstem."
- Przycisk "Spróbuj ponownie" - focus na textarea

### 8.3. Przegląd i akceptacja propozycji

**Krok 1:** Użytkownik przegląda listę fiszek
- Widzi wszystkie wygenerowane propozycje
- Każda fiszka ma domyślny wygląd (pending state)

**Krok 2a:** Akceptacja fiszki
- Użytkownik klika przycisk "Akceptuj" (✓) przy fiszce
- Fiszka zmienia wygląd:
  - Zielony border (border-green-500)
  - Lekkie zielone tło (bg-green-50)
  - Badge "Zaakceptowana"
- Licznik "Zaakceptowane" aktualizuje się: "Zaakceptowane: 1/X"
- Przycisk "Zapisz zaakceptowane (1)" staje się aktywny

**Krok 2b:** Ponowne kliknięcie "Akceptuj" (toggle)
- Fiszka wraca do stanu pending
- Licznik się zmniejsza

### 8.4. Edycja propozycji

**Krok 1:** Użytkownik klika "Edytuj" (✏) przy fiszce
- Otwiera się FlashcardEditModal
- Modal zawiera:
  - Tytuł "Edytuj fiszkę"
  - Pole "Przód fiszki" z aktualną treścią front
  - Licznik "X / 200"
  - Pole "Tył fiszki" z aktualną treścią back
  - Licznik "X / 500"
  - Przycisk "Anuluj" i "Zapisz"

**Krok 2:** Użytkownik edytuje tekst
- Wprowadza zmiany w polach
- Liczniki aktualizują się na bieżąco
- Walidacja realtime:
  - Gdy front > 200: komunikat błędu pod polem + przycisk "Zapisz" wyłączony
  - Gdy back > 500: komunikat błędu pod polem + przycisk "Zapisz" wyłączony
  - Gdy puste: komunikat "To pole jest wymagane" + przycisk wyłączony

**Krok 3:** Użytkownik klika "Zapisz"
- Modal się zamyka
- Fiszka w liście aktualizuje się z nową treścią
- Fiszka zmienia wygląd:
  - Niebieski border (border-blue-500)
  - Lekkie niebieskie tło (bg-blue-50)
  - Badge "Edytowana"
- Licznik "Edytowane" aktualizuje się: "Edytowane: 1"
- Licznik "Zaakceptowane" uwzględnia tę fiszkę: "Zaakceptowane: X" (edited liczy się jako accepted)

**Krok 4 (alt):** Użytkownik klika "Anuluj" lub ESC
- Modal się zamyka bez zmian
- Fiszka pozostaje w poprzednim stanie

### 8.5. Odrzucenie propozycji

**Krok 1:** Użytkownik klika "Odrzuć" (✗) przy fiszce
- Fiszka zmienia wygląd:
  - Szary border
  - Opacity 0.5
  - Opcjonalnie: przekreślenie tekstu
  - Badge "Odrzucona"
- Licznik "Odrzucone" aktualizuje się: "Odrzucone: 1"
- Fiszka nie będzie uwzględniona przy zapisie

**Krok 2 (toggle):** Ponowne kliknięcie "Odrzuć"
- Fiszka wraca do stanu pending
- Licznik się zmniejsza

### 8.6. Zapis zaakceptowanych fiszek

**Krok 1:** Użytkownik zaakceptował/edytował kilka fiszek
- Przycisk "Zapisz zaakceptowane (X)" jest aktywny
- X = liczba fiszek z action 'accepted' lub 'edited'

**Krok 2:** Użytkownik klika "Zapisz zaakceptowane (X)"
- Przycisk wyłącza się
- Tekst zmienia się na "Zapisywanie..."
- Wywołanie API POST /api/flashcards/batch z:
  - `generation_id`
  - `flashcards`: tylko zaakceptowane/edytowane fiszki
  - `source`: 'ai-full' dla accepted, 'ai-edited' dla edited

**Krok 3a:** Sukces (201 Created)
- Toast sukcesu: "Zapisano X fiszek" (z zielonym checkmarkiem)
- Stan się resetuje:
  - Textarea czyści się
  - Lista propozycji znika
  - ActionButtons znikają
  - Użytkownik może rozpocząć nową generację
- Opcjonalnie: Toast z przyciskiem "Zobacz fiszki" -> redirect do /flashcards

**Krok 3b:** Błąd
- Toast error z komunikatem błędu
- Przycisk wraca do stanu aktywnego
- Stan propozycji pozostaje bez zmian
- Użytkownik może spróbować ponownie

### 8.7. Zapis wszystkich fiszek

**Krok 1:** Użytkownik klika "Zapisz wszystkie (Y)"
- Działanie analogiczne do "Zapisz zaakceptowane"
- Różnica: zapisywane są wszystkie propozycje (niezależnie od action)
- Przed zapisem wszystkie pending/rejected fiszki automatycznie zmieniają action na 'accepted'

---

## 9. Warunki i walidacja

### 9.1. Walidacja wprowadzania tekstu

**Komponent:** TextInputSection

**Warunki:**
1. **Długość tekstu >= 1000 znaków**
   - Weryfikacja: `text.length >= GenerationConstraints.SOURCE_TEXT_MIN_LENGTH`
   - Jeśli NIE:
     - Komunikat: "Tekst jest za krótki. Minimum 1000 znaków. (aktualnie: X)"
     - Typ: error (czerwony)
     - Przycisk "Generuj fiszki" wyłączony

2. **Długość tekstu <= 10000 znaków**
   - Weryfikacja: `text.length <= GenerationConstraints.SOURCE_TEXT_MAX_LENGTH`
   - Jeśli NIE:
     - Komunikat: "Tekst jest za długi. Maksimum 10000 znaków. (aktualnie: X)"
     - Typ: error (czerwony)
     - Przycisk "Generuj fiszki" wyłączony
     - Licznik znaków zmienia kolor na czerwony

3. **Tekst w zakresie 1000-10000 znaków**
   - Weryfikacja: `text.length >= 1000 && text.length <= 10000`
   - Jeśli TAK:
     - Komunikat: "Tekst gotowy do generowania (X znaków)"
     - Typ: success (zielony)
     - Przycisk "Generuj fiszki" aktywny (jeśli !isGenerating)

4. **Tekst pusty**
   - Weryfikacja: `text.length === 0`
   - Komunikat: "Wklej tekst do wygenerowania fiszek (1000-10000 znaków)"
   - Typ: info (neutralny)
   - Przycisk wyłączony

**Wpływ na UI:**
- ValidationMessage wyświetla odpowiedni komunikat
- CharacterCounter zmienia kolor:
  - Czerwony: > 10000
  - Pomarańczowy: 0 < length < 1000
  - Zielony: 1000 <= length <= 10000
- Button "Generuj fiszki" disabled gdy walidacja nie przechodzi lub isGenerating=true

### 9.2. Walidacja edycji fiszki

**Komponent:** FlashcardEditModal

**Warunki dla pola "Przód fiszki":**
1. **Pole required**
   - Weryfikacja: `front.trim().length > 0`
   - Jeśli NIE: błąd "Przód fiszki jest wymagany"

2. **Maksymalna długość 200 znaków**
   - Weryfikacja: `front.length <= FlashcardConstraints.FRONT_MAX_LENGTH`
   - Jeśli NIE: błąd "Maksymalna długość: 200 znaków (aktualnie: X)"

**Warunki dla pola "Tył fiszki":**
1. **Pole required**
   - Weryfikacja: `back.trim().length > 0`
   - Jeśli NIE: błąd "Tył fiszki jest wymagany"

2. **Maksymalna długość 500 znaków**
   - Weryfikacja: `back.length <= FlashcardConstraints.BACK_MAX_LENGTH`
   - Jeśli NIE: błąd "Maksymalna długość: 500 znaków (aktualnie: X)"

**Walidacja ogólna:**
- Oba pola muszą przejść walidację jednocześnie
- Przycisk "Zapisz" disabled gdy: `!isValid || (!frontChanged && !backChanged)`
- Walidacja realtime (na onChange)

**Wpływ na UI:**
- Komunikaty błędów wyświetlane pod polami (czerwony tekst)
- Liczniki znaków: "X / 200" i "X / 500"
- Kolor licznika: czerwony gdy przekroczono limit
- Border pola: czerwony gdy błąd
- Przycisk "Zapisz" disabled gdy walidacja nie przechodzi

### 9.3. Warunki zapisu fiszek

**Komponent:** ActionButtons

**Warunki dla przycisku "Zapisz zaakceptowane (X)":**
1. **generationId !== null**
   - Musi istnieć ID generacji z API
2. **Liczba zaakceptowanych > 0**
   - Weryfikacja: `proposals.filter(p => p.action === 'accepted' || p.action === 'edited').length > 0`
3. **isSaving === false**
   - Nie trwa już inny zapis

**Warunki dla przycisku "Zapisz wszystkie (Y)":**
1. **generationId !== null**
2. **proposals.length > 0**
   - Są jakieś propozycje do zapisu
3. **isSaving === false**

**Wpływ na UI:**
- Przyciski disabled gdy warunki nie spełnione
- Podczas zapisu (isSaving=true):
  - Przyciski disabled
  - Tekst zmienia się na "Zapisywanie..."
  - Opcjonalnie: spinner icon
- Liczba w nawiasach aktualizuje się dynamicznie

### 9.4. Warunki API (weryfikacja na froncie)

**Przed wywołaniem POST /api/generations:**
- Sprawdzenie długości tekstu (1000-10000)
- Sprawdzenie obecności JWT token (jeśli brak -> redirect /login)
- Ustawienie timeout na 30 sekund

**Przed wywołaniem POST /api/flashcards/batch:**
- Sprawdzenie generationId !== null
- Walidacja długości front/back każdej fiszki przed wysłaniem:
  - front: 1 <= length <= 200
  - back: 1 <= length <= 500
- Sprawdzenie obecności JWT token
- Ustawienie timeout na 10 sekund

**Obsługa błędów rate limit (429):**
- Wyświetlić komunikat z limitem (10/godzinę)
- Wyłączyć przycisk generowania
- Opcjonalnie: countdown timer do następnego dostępnego slotu (jeśli API zwraca header X-RateLimit-Reset)

---

## 10. Obsługa błędów

### 10.1. Błędy generowania fiszek

**400 Bad Request** (nieprawidłowa długość tekstu):
- **Trigger:** API zwróciło 400 z kodem VALIDATION_ERROR
- **Komunikat:** "Nieprawidłowa długość tekstu. Wymagane: 1000-10000 znaków."
- **Akcja:**
  - Toast error (czerwony, 5 sekund)
  - Focus na textarea
  - Podświetlenie textarea ramką czerwoną (przez 2 sekundy)
- **UI:** Użytkownik może edytować tekst i spróbować ponownie

**422 Unprocessable Entity** (LLM generation failed):
- **Trigger:** API zwróciło 422 z kodem LLM_GENERATION_FAILED
- **Komunikat:** "Nie udało się wygenerować fiszek. Spróbuj ponownie z innym tekstem."
- **Akcja:**
  - Toast error z przyciskiem "Spróbuj ponownie"
  - Kliknięcie "Spróbuj ponownie" -> focus na textarea i możliwość edycji
- **UI:** Formularz pozostaje wypełniony, użytkownik może edytować i retry

**429 Too Many Requests** (rate limit exceeded):
- **Trigger:** API zwróciło 429 z kodem RATE_LIMIT_EXCEEDED
- **Komunikat:** "Przekroczono limit generacji (10 na godzinę). Spróbuj ponownie za X minut."
- **Akcja:**
  - Toast error (nie znika automatycznie, wymaga zamknięcia)
  - Wyłączenie przycisku "Generuj fiszki" na X minut
  - Jeśli API zwraca header X-RateLimit-Reset: obliczenie czasu i wyświetlenie countdown
- **UI:** Komunikat nad przyciskiem: "Następna generacja dostępna za: MM:SS"

**401 Unauthorized** (invalid/expired token):
- **Trigger:** API zwróciło 401
- **Komunikat:** "Sesja wygasła. Zaloguj się ponownie."
- **Akcja:**
  - Toast warning
  - Redirect do /login (zachowanie URL w query: ?redirect=/generate)
  - Po ponownym logowaniu: redirect z powrotem do /generate
- **UI:** Przekierowanie

**Network Error / Timeout**:
- **Trigger:** Brak odpowiedzi z serwera, timeout (>30s), błąd sieci
- **Komunikat:** "Sprawdź połączenie z internetem i spróbuj ponownie."
- **Akcja:**
  - Toast error z przyciskiem "Spróbuj ponownie"
  - Kliknięcie retry -> ponowne wywołanie generateFlashcards()
- **UI:** Możliwość retry bez utraty danych

**Pusty wynik (generated_count = 0 lub proposed_flashcards = [])**:
- **Trigger:** API zwróciło sukces, ale brak propozycji
- **Komunikat:** EmptyState: "Model nie wygenerował żadnych fiszek. Spróbuj z dłuższym lub bardziej treściwym tekstem."
- **Akcja:**
  - Wyświetlenie EmptyState zamiast listy
  - Przycisk "Spróbuj ponownie" -> focus na textarea
- **UI:** Użytkownik może zmienić tekst i retry

### 10.2. Błędy zapisu fiszek

**400 Bad Request** (validation errors):
- **Trigger:** API zwróciło 400 z kodem VALIDATION_ERROR
- **Komunikat:** "Niektóre fiszki zawierają nieprawidłowe dane. Sprawdź długość treści."
- **Akcja:**
  - Toast error
  - Jeśli API zwraca szczegóły (field, index): podświetlić problematyczną fiszkę
  - Umożliwić edycję i ponowny zapis
- **UI:** Problematyczne fiszki z czerwoną ramką, możliwość edycji

**404 Not Found** (generation doesn't exist):
- **Trigger:** API zwróciło 404 z kodem NOT_FOUND
- **Komunikat:** "Generacja nie istnieje lub nie należy do Ciebie."
- **Akcja:**
  - Toast error
  - Reset stanu: wyczyszczenie propozycji, generationId = null
  - Powrót do pustego formularza
- **UI:** Czysty formularz, użytkownik może rozpocząć nową generację

**401 Unauthorized**:
- **Trigger:** API zwróciło 401
- **Komunikat:** "Sesja wygasła. Zaloguj się ponownie."
- **Akcja:**
  - Toast warning
  - Zapisanie stanu do localStorage (aby nie utracić pracy)
  - Redirect do /login z ?redirect=/generate
- **UI:** Przekierowanie, możliwość odzyskania sesji

**Network Error**:
- **Trigger:** Brak odpowiedzi, timeout, błąd sieci
- **Komunikat:** "Nie udało się zapisać fiszek. Spróbuj ponownie."
- **Akcja:**
  - Toast error z przyciskiem "Spróbuj ponownie"
  - Stan pozostaje bez zmian
  - Kliknięcie retry -> ponowne wywołanie saveBatchFlashcards()
- **UI:** Możliwość retry, dane nie są tracone

### 10.3. Scenariusze brzegowe

**Wszystkie fiszki odrzucone:**
- **Scenariusz:** Użytkownik odrzucił wszystkie propozycje (action = 'rejected')
- **Obsługa:**
  - Przycisk "Zapisz zaakceptowane" wyłączony (acceptedCount = 0)
  - Przycisk "Zapisz wszystkie" nadal aktywny (zapisze wszystkie jako 'ai-full')
  - Komunikat informacyjny: "Nie zaakceptowano żadnej fiszki. Możesz zapisać wszystkie lub wygenerować nowe."
- **UI:** Normalna sytuacja, brak błędu

**Utrata połączenia podczas generowania:**
- **Scenariusz:** Request wysłany, następnie utrata internetu
- **Obsługa:**
  - Timeout po 30 sekundach
  - Komunikat: "Generowanie trwa zbyt długo. Sprawdź połączenie z internetem."
  - Opcja "Anuluj" i "Spróbuj ponownie"
- **UI:** LoadingSkeleton z komunikatem i opcjami akcji

**Przypadkowe odświeżenie strony:**
- **Scenariusz:** Użytkownik odświeża stronę (F5) po wygenerowaniu propozycji
- **Obsługa:**
  - Sprawdzenie localStorage przy montowaniu komponentu
  - Jeśli znaleziono draft (< 30 minut):
    - Modal: "Odzyskać poprzednią sesję generowania?"
    - Przyciski: "Odzyskaj" / "Zacznij od nowa"
  - Jeśli "Odzyskaj": przywrócenie stanu z localStorage
  - Jeśli "Zacznij od nowa": wyczyszczenie localStorage i pusty formularz
- **UI:** Modal decyzyjny, uniknięcie utraty pracy

**Długi czas generowania (>15 sekund):**
- **Scenariusz:** API odpowiada powoli
- **Obsługa:**
  - Po 15 sekundach: dodatkowy komunikat "Generowanie nadal trwa, proszę czekać..."
  - Po 30 sekundach: timeout i komunikat błędu
  - Możliwość anulowania (opcjonalnie, jeśli API wspiera)
- **UI:** Progresywne komunikaty, opcja cancel

**Edycja podczas zapisu:**
- **Scenariusz:** Użytkownik próbuje edytować fiszki podczas trwającego zapisu
- **Obsługa:**
  - Wszystkie przyciski akcji disabled gdy isSaving=true
  - Komunikat tooltip: "Trwa zapisywanie fiszek..."
- **UI:** Zablokowane interakcje, jasna komunikacja stanu

---

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury projektu
1. Utworzenie folderu `src/pages/generate/` dla strony Astro
2. Utworzenie folderu `src/components/generate/` dla komponentów React
3. Utworzenie folderu `src/hooks/` dla custom hooków
4. Utworzenie folderu `src/services/api/` dla API clients

### Krok 2: Implementacja typów ViewModel
1. Utworzenie pliku `src/types/generate-view.ts`
2. Zdefiniowanie wszystkich nowych typów:
   - FlashcardActionType
   - FlashcardProposalState
   - GenerateViewState
   - TextInputValidation
   - FlashcardValidationErrors
   - FlashcardValidationResult
3. Export typów z `src/types/index.ts`

### Krok 3: Implementacja custom hooków
1. **useTextValidation** (`src/hooks/useTextValidation.ts`):
   - Logika walidacji długości tekstu
   - Generowanie komunikatów
   - Export hooka
2. **useFlashcardValidation** (`src/hooks/useFlashcardValidation.ts`):
   - Logika walidacji pól front/back
   - Generowanie błędów
   - Export hooka
3. **useGenerateFlashcards** (`src/hooks/useGenerateFlashcards.ts`):
   - Główny hook zarządzający stanem widoku
   - Implementacja wszystkich metod (handleGenerate, handleAccept, etc.)
   - Integracja z API clients
   - Export hooka

### Krok 4: Implementacja API clients
1. **API client base** (`src/services/api/client.ts`):
   - Konfiguracja axios instance
   - Request interceptor (Authorization header)
   - Response interceptor (obsługa 401)
   - Export apiClient
2. **Generations API** (`src/services/api/generations.ts`):
   - Funkcja generateFlashcards()
   - Export
3. **Flashcards API** (`src/services/api/flashcards.ts`):
   - Funkcja saveBatchFlashcards()
   - Export

### Krok 5: Implementacja komponentów pomocniczych
1. **CharacterCounter** (`src/components/generate/CharacterCounter.tsx`):
   - Prosty komponent z licznikiem
   - Logika kolorowania
2. **ValidationMessage** (`src/components/generate/ValidationMessage.tsx`):
   - Komponent z komunikatem walidacji
   - Style dla różnych typów (error/success/info)
3. **LoadingSkeleton** (`src/components/generate/LoadingSkeleton.tsx`):
   - Wykorzystanie Skeleton z Shadcn/ui
   - Imitacja struktury FlashcardProposalItem
4. **EmptyState** (`src/components/generate/EmptyState.tsx`):
   - Ikona, tekst, przycisk retry

### Krok 6: Implementacja TextInputSection
1. Utworzenie `src/components/generate/TextInputSection.tsx`
2. Implementacja struktury:
   - Form element
   - Textarea (Shadcn/ui)
   - CharacterCounter
   - ValidationMessage
   - Button "Generuj fiszki"
3. Obsługa zdarzeń (onChange, onSubmit)
4. Integracja z useTextValidation
5. Stylowanie (Tailwind)

### Krok 7: Implementacja FlashcardEditModal
1. Utworzenie `src/components/generate/FlashcardEditModal.tsx`
2. Implementacja struktury:
   - Dialog (Shadcn/ui)
   - Formularz z polami front/back
   - Liczniki znaków
   - Komunikaty błędów
   - Przyciski Save/Cancel
3. Integracja z useFlashcardValidation
4. Obsługa zdarzeń
5. Stylowanie

### Krok 8: Implementacja FlashcardProposalItem
1. Utworzenie `src/components/generate/FlashcardProposalItem.tsx`
2. Implementacja struktury:
   - Card (Shadcn/ui)
   - Wyświetlanie front/back
   - Badge ze statusem
   - Trzy przyciski akcji
3. Logika wariantów wizualnych (według action)
4. Obsługa zdarzeń (onClick buttons)
5. Stylowanie (Tailwind, warunki CSS)

### Krok 9: Implementacja GeneratedFlashcardsList
1. Utworzenie `src/components/generate/GeneratedFlashcardsList.tsx`
2. Implementacja struktury:
   - Nagłówek z licznikami
   - Mapowanie proposals na FlashcardProposalItem
   - EmptyState (warunkowe)
3. Przekazywanie callbacków do dzieci
4. Stylowanie (grid/flex layout, responsywność)

### Krok 10: Implementacja ActionButtons
1. Utworzenie `src/components/generate/ActionButtons.tsx`
2. Implementacja struktury:
   - Kontener flex
   - Dwa przyciski (Shadcn/ui Button)
   - Liczniki w tekście przycisków
3. Logika disabled (warunki)
4. Obsługa zdarzeń (onClick)
5. Stylowanie

### Krok 11: Implementacja głównego widoku
1. Utworzenie `src/pages/generate.astro` lub `src/components/generate/GenerateFlashcardsView.tsx`
2. Implementacja struktury:
   - Layout kontener
   - Nagłówek widoku
   - TextInputSection
   - LoadingSkeleton (warunkowe, gdy isGenerating)
   - GeneratedFlashcardsList (warunkowe, gdy proposals.length > 0)
   - FlashcardEditModal (warunkowe, gdy editingIndex !== null)
   - ActionButtons (warunkowe, gdy proposals.length > 0)
3. Integracja z useGenerateFlashcards:
   - Destructuring state i metod
   - Przekazywanie propsów do komponentów
4. Obsługa toastów (sukces/błędy)
5. Stylowanie layoutu (responsywność)

### Krok 12: Implementacja persistencji (opcjonalna)
1. Utworzenie `src/utils/localStorage.ts` z helper funkcjami:
   - saveDraft()
   - loadDraft()
   - clearDraft()
2. Dodanie logiki w useGenerateFlashcards:
   - useEffect zapisujący draft (debounced)
   - Odczyt draft przy montowaniu
3. Modal potwierdzenia odzyskania sesji

### Krok 13: Routing i middleware
1. Konfiguracja ścieżki `/generate` w routingu Astro
2. Dodanie middleware sprawdzającego uwierzytelnienie:
   - Jeśli brak JWT token -> redirect do /login
3. Layout z nawigacją (link do /generate w menu)

### Krok 14: Testy i walidacja
1. Testy jednostkowe hooków:
   - useTextValidation (różne długości)
   - useFlashcardValidation (różne przypadki)
2. Testy integracyjne komponentów:
   - TextInputSection (walidacja, disable/enable button)
   - FlashcardEditModal (walidacja, save/cancel)
   - FlashcardProposalItem (zmiana statusów)
3. Testy E2E (Playwright):
   - Pełny flow: wprowadzenie tekstu -> generowanie -> edycja -> zapis
   - Obsługa błędów API (mock responses)
4. Testy responsywności (mobile/tablet/desktop)

### Krok 15: Optymalizacja i polishing
1. Optymalizacja performance:
   - React.memo dla komponentów
   - useMemo dla computed values
   - useCallback dla callbacków
2. Accessibility:
   - ARIA labels
   - Keyboard navigation
   - Focus management (po zamknięciu modalu, po błędzie)
   - Screen reader testing
3. UX improvements:
   - Smooth animations (transitions, fading)
   - Loading states (skeletons, spinners)
   - Optimistic UI updates (gdzie możliwe)
4. Error boundary:
   - Catch React errors
   - Fallback UI

### Krok 16: Dokumentacja
1. Komentarze JSDoc dla typów i funkcji
2. README dla komponentów (props, usage examples)
3. Storybook stories (opcjonalnie, dla design system)

---

## Uwagi końcowe

- **Priorytety:** Krok 1-11 są krytyczne dla MVP. Kroki 12-16 są opcjonalne/nice-to-have.
- **Testowanie:** Regularne testowanie po każdym kroku (nie czekać do końca).
- **Iteracyjność:** Możliwe są drobne zmiany w strukturze podczas implementacji (zachować elastyczność).
- **Code review:** Przegląd kodu po implementacji każdego głównego komponentu.
- **Performance:** Monitorować performance (React DevTools Profiler) zwłaszcza dla listy fiszek (może być >20 itemów).
- **Security:** Zawsze sanityzować dane przed wyświetleniem (XSS protection), choć React domyślnie escapuje.
