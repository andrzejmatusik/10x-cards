/**
 * Text input section component
 * Contains textarea, validation, and generate button
 */

import type { FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "./CharacterCounter";
import { ValidationMessage } from "./ValidationMessage";
import { useTextValidation } from "@/hooks/useTextValidation";

export interface TextInputSectionProps {
  /** Current text value */
  value: string;
  /** Callback when text changes */
  onChange: (text: string) => void;
  /** Callback when generate button is clicked */
  onGenerate: (text: string) => void;
  /** Whether generation is in progress */
  isLoading: boolean;
  /** Error message from API */
  error?: string | null;
}

export function TextInputSection({ value, onChange, onGenerate, isLoading, error }: TextInputSectionProps) {
  const validation = useTextValidation(value);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validation.isValid && !isLoading) {
      onGenerate(value);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Generuj fiszki z AI</h2>
        <p className="text-muted-foreground">Wklej tekst (1000-10000 znaków) do wygenerowania fiszek</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Wklej tutaj materiał do nauki, z którego chcesz wygenerować fiszki..."
            className="min-h-[200px] resize-y"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <ValidationMessage message={error || validation.message} type={error ? "error" : validation.messageType} />
            <CharacterCounter
              current={validation.isValid ? value.length : validation.isTooLong ? value.length : value.length}
              max={10000}
              isValid={validation.isValid}
            />
          </div>
        </div>

        <Button type="submit" disabled={!validation.isValid || isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Generowanie...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generuj fiszki
            </>
          )}
        </Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Generowanie może potrwać do 30 sekund...</p>}
    </div>
  );
}
