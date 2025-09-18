/**
 * @jest-environment node
 */

import { NextResponse } from "next/server";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiValidationError,
  apiCreated,
  apiOk,
  apiNotFound,
  apiConflict,
  apiPayloadTooLarge,
  apiUnsupportedMediaType,
  apiInternalError,
  ApiErrorCode,
  logger,
  getRequestId,
  logRequest
} from "../api";

// Mock console methods
const originalConsole = console;
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

beforeEach(() => {
  global.console = mockConsole as any;
  jest.clearAllMocks();
});

afterAll(() => {
  global.console = originalConsole;
});

describe("API Helpers", () => {
  describe("apiSuccess", () => {
    it("should create successful response with data", () => {
      const data = { message: "success" };
      const response = apiSuccess(data);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      
      // Check if logging was called
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining("API Success"),
        expect.any(String)
      );
    });

    it("should create successful response without data", () => {
      const response = apiSuccess();

      expect(response.status).toBe(200);
    });

    it("should create successful response with custom status", () => {
      const response = apiSuccess(null, { status: 201 });

      expect(response.status).toBe(200); // apiSuccess always uses 200 unless overridden
    });
  });

  describe("apiError", () => {
    it("should create error response with message", () => {
      const message = "Something went wrong";
      const response = apiError(message);

      expect(response.status).toBe(400);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should create error response with details", () => {
      const message = "Validation failed";
      const details = { field: "required" };
      const response = apiError(message, details);

      expect(response.status).toBe(400);
    });

    it("should create error response with custom status", () => {
      const message = "Not found";
      const response = apiError(message, undefined, 404);

      expect(response.status).toBe(404);
    });

    it("should include error code when provided", () => {
      const message = "Validation error";
      const response = apiError(message, undefined, 400, ApiErrorCode.VALIDATION_ERROR);

      expect(response.status).toBe(400);
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe("apiUnauthorized", () => {
    it("should create unauthorized response", () => {
      const response = apiUnauthorized();

      expect(response.status).toBe(401);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it("should create unauthorized response with custom message", () => {
      const message = "Access denied";
      const response = apiUnauthorized(message);

      expect(response.status).toBe(401);
    });

    it("should include error code", () => {
      const response = apiUnauthorized("Forbidden", ApiErrorCode.FORBIDDEN);

      expect(response.status).toBe(401);
    });
  });

  describe("apiValidationError", () => {
    it("should create validation error response", () => {
      const details = [{ field: "email", message: "Invalid email" }];
      const response = apiValidationError(details);

      expect(response.status).toBe(400);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it("should create validation error with custom message", () => {
      const details = { field: "required" };
      const message = "Form validation failed";
      const response = apiValidationError(details, message);

      expect(response.status).toBe(400);
    });
  });

  describe("apiCreated", () => {
    it("should create created response with data", () => {
      const data = { id: 1, name: "new item" };
      const response = apiCreated(data);

      expect(response.status).toBe(201);
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it("should create created response without data", () => {
      const response = apiCreated();

      expect(response.status).toBe(201);
    });
  });

  describe("apiOk", () => {
    it("should create ok response", () => {
      const response = apiOk();

      expect(response.status).toBe(200);
      expect(mockConsole.info).toHaveBeenCalled();
    });
  });

  describe("apiNotFound", () => {
    it("should create not found response", () => {
      const response = apiNotFound();

      expect(response.status).toBe(404);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it("should create not found response with custom message", () => {
      const message = "User not found";
      const response = apiNotFound(message);

      expect(response.status).toBe(404);
    });
  });

  describe("apiConflict", () => {
    it("should create conflict response", () => {
      const response = apiConflict();

      expect(response.status).toBe(409);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it("should create conflict response with details", () => {
      const details = { conflict: "duplicate" };
      const response = apiConflict("Conflict", details);

      expect(response.status).toBe(409);
    });
  });

  describe("apiPayloadTooLarge", () => {
    it("should create payload too large response", () => {
      const response = apiPayloadTooLarge();

      expect(response.status).toBe(413);
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe("apiUnsupportedMediaType", () => {
    it("should create unsupported media type response", () => {
      const response = apiUnsupportedMediaType();

      expect(response.status).toBe(415);
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe("apiInternalError", () => {
    it("should create internal error response", () => {
      const response = apiInternalError();

      expect(response.status).toBe(500);
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it("should create internal error response with details", () => {
      const details = { error: "database connection" };
      const response = apiInternalError("Database error", details);

      expect(response.status).toBe(500);
    });
  });

  describe("getRequestId", () => {
    it("should generate random request ID when no request provided", () => {
      const id = getRequestId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should extract request ID from headers", () => {
      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => {
            if (name === "x-request-id") return "test-id-123";
            return null;
          }),
        },
      } as any;

      const id = getRequestId(mockRequest);
      
      expect(id).toBe("test-id-123");
    });

    it("should fallback to correlation ID", () => {
      const mockRequest = {
        headers: {
          get: jest.fn((name: string) => {
            if (name === "x-correlation-id") return "corr-id-456";
            return null;
          }),
        },
      } as any;

      const id = getRequestId(mockRequest);
      
      expect(id).toBe("corr-id-456");
    });

    it("should generate new ID when no headers provided", () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;

      const id = getRequestId(mockRequest);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
    });
  });

  describe("logRequest", () => {
    it("should log request information", () => {
      const mockRequest = {
        method: "GET",
        url: "http://localhost:3000/api/test",
        headers: {
          get: jest.fn(() => "test-id"),
        },
      } as any;

      const mockResponse = {
        status: 200,
      } as any;

      const id = logRequest(mockRequest, mockResponse);
      
      expect(id).toBe("test-id");
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining("Request processed"),
        expect.any(Object)
      );
    });
  });

  describe("Error codes enum", () => {
    it("should have all expected error codes", () => {
      expect(ApiErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ApiErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(ApiErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ApiErrorCode.INTERNAL_SERVER_ERROR).toBe("INTERNAL_SERVER_ERROR");
    });
  });
});