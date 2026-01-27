/**
 * Unit tests for flashcard validation utilities
 * Tests Zod schema validation for create flashcard command
 */

import { describe, it, expect } from "vitest";

import { validateCreateFlashcardCommand, ValidationError } from "../flashcard-validation";
import { FlashcardConstraints } from "@/types";

describe("validateCreateFlashcardCommand", () => {
  describe("Valid input", () => {
    it("should pass validation for valid command", () => {
      const command = {
        front: "What is TypeScript?",
        back: "A typed superset of JavaScript",
      };

      const result = validateCreateFlashcardCommand(command);

      expect(result).toEqual(command);
    });

    it("should pass validation with minimum length (1 character)", () => {
      const command = {
        front: "Q",
        back: "A",
      };

      const result = validateCreateFlashcardCommand(command);

      expect(result).toEqual(command);
    });

    it("should pass validation at maximum lengths", () => {
      const command = {
        front: "x".repeat(FlashcardConstraints.FRONT_MAX_LENGTH),
        back: "y".repeat(FlashcardConstraints.BACK_MAX_LENGTH),
      };

      const result = validateCreateFlashcardCommand(command);

      expect(result).toEqual(command);
    });

    it("should pass validation with special characters", () => {
      const command = {
        front: "What's 2 + 2 = ?",
        back: "4 (2+2=4) <correct>",
      };

      const result = validateCreateFlashcardCommand(command);

      expect(result).toEqual(command);
    });
  });

  describe("Missing fields", () => {
    it("should throw error for missing front field", () => {
      const command = {
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for missing back field", () => {
      const command = {
        front: "Question",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for missing both fields", () => {
      const command = {};

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for null input", () => {
      expect(() => validateCreateFlashcardCommand(null)).toThrow(ValidationError);
    });

    it("should throw error for undefined input", () => {
      expect(() => validateCreateFlashcardCommand(undefined)).toThrow(ValidationError);
    });
  });

  describe("Empty strings", () => {
    it("should throw error for empty front string", () => {
      const command = {
        front: "",
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for empty back string", () => {
      const command = {
        front: "Question",
        back: "",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });
  });

  describe("Whitespace only", () => {
    it("should throw error for front with only spaces", () => {
      const command = {
        front: "   ",
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for back with only spaces", () => {
      const command = {
        front: "Question",
        back: "   ",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for front with tabs and newlines", () => {
      const command = {
        front: "\t\n\r",
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });
  });

  describe("Maximum length exceeded", () => {
    it("should throw error for front exceeding max length", () => {
      const command = {
        front: "x".repeat(FlashcardConstraints.FRONT_MAX_LENGTH + 1),
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for back exceeding max length", () => {
      const command = {
        front: "Question",
        back: "y".repeat(FlashcardConstraints.BACK_MAX_LENGTH + 1),
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error when both fields exceed max length", () => {
      const command = {
        front: "x".repeat(FlashcardConstraints.FRONT_MAX_LENGTH + 1),
        back: "y".repeat(FlashcardConstraints.BACK_MAX_LENGTH + 1),
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });
  });

  describe("Type errors", () => {
    it("should throw error for non-string front", () => {
      const command = {
        front: 123,
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for non-string back", () => {
      const command = {
        front: "Question",
        back: 456,
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for boolean front", () => {
      const command = {
        front: true,
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for array front", () => {
      const command = {
        front: ["Question"],
        back: "Answer",
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });

    it("should throw error for object back", () => {
      const command = {
        front: "Question",
        back: { text: "Answer" },
      };

      expect(() => validateCreateFlashcardCommand(command)).toThrow(ValidationError);
    });
  });

  describe("ValidationError details", () => {
    it("should include field name in error details", () => {
      const command = {
        back: "Answer",
      };

      try {
        validateCreateFlashcardCommand(command);
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBeDefined();
      }
    });

    it("should include constraint in error details", () => {
      const command = {
        back: "Answer",
      };

      try {
        validateCreateFlashcardCommand(command);
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).constraint).toBe("validation_failed");
      }
    });

    it("should include message in error details", () => {
      const command = {
        back: "Answer",
      };

      try {
        validateCreateFlashcardCommand(command);
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details.message).toBeDefined();
      }
    });
  });
});
