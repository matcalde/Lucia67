import { NextResponse } from "next/server";
import { ApiSuccess, ApiError } from "@/lib/schemas";

// Error codes for granular error handling
export enum ApiErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE",
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  
  // Custom domain errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
}

// Severity levels for logging
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

// Structured logging interface
interface LogEntry {
  level: LogLevel;
  message: string;
  code?: ApiErrorCode;
  context?: unknown;
  timestamp?: string;
  requestId?: string;
}

// Logger utility
class ApiLogger {
  private static instance: ApiLogger;
  
  static getInstance(): ApiLogger {
    if (!ApiLogger.instance) {
      ApiLogger.instance = new ApiLogger();
    }
    return ApiLogger.instance;
  }

  private log(entry: LogEntry) {
    const logData = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // In production, this would send to a logging service
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(logData));
    } else {
      console[entry.level](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || "");
    }
  }

  debug(message: string, context?: unknown) {
    this.log({ level: LogLevel.DEBUG, message, context });
  }

  info(message: string, context?: unknown) {
    this.log({ level: LogLevel.INFO, message, context });
  }

  warn(message: string, code?: ApiErrorCode, context?: unknown) {
    this.log({ level: LogLevel.WARN, message, code, context });
  }

  error(message: string, code?: ApiErrorCode, context?: unknown) {
    this.log({ level: LogLevel.ERROR, message, code, context });
  }
}

// Export singleton logger
export const logger = ApiLogger.getInstance();

// Request ID generator for tracing
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Enhanced API response helpers
/**
 * Helper per risposta di successo API uniforme
 */
export function apiSuccess<T = any>(
  data?: T,
  init?: ResponseInit
): NextResponse<ApiSuccess> {
  logger.info("API Success", `${data ? "present" : "empty"}:${init?.status || 200}`);
  return NextResponse.json(
    { ok: true, ...(data !== undefined && { data }) },
    { ...(init || {}), status: 200 }
  );
}

/**
 * Helper per risposta di errore API uniforme
 */
export function apiError(
  error: string,
  details?: any,
  status = 400,
  code?: ApiErrorCode
): NextResponse<ApiError> {
  const errorCode = code || ApiErrorCode.INTERNAL_SERVER_ERROR;
  logger.error(error, errorCode, { status, details });
  
  return NextResponse.json(
    { 
      ok: false, 
      error,
      code: errorCode,
      ...(details !== undefined && { details })
    },
    { status }
  );
}

/**
 * Helper per errore di autorizzazione
 */
export function apiUnauthorized(
  message = "Unauthorized",
  code: ApiErrorCode = ApiErrorCode.UNAUTHORIZED
): NextResponse<ApiError> {
  logger.warn(message, code);
  return apiError(message, undefined, 401, code);
}

/**
 * Helper per errore di validazione
 */
export function apiValidationError(
  details: any, 
  message = "Validazione fallita",
  code: ApiErrorCode = ApiErrorCode.VALIDATION_ERROR
): NextResponse<ApiError> {
  logger.warn(message, code, { details });
  return apiError(message, details, 400, code);
}

/**
 * Helper per successo di creazione
 */
export function apiCreated<T = any>(data?: T): NextResponse<ApiSuccess> {
  logger.info("Resource created", { data: data ? "present" : "empty" });
  return NextResponse.json(
    { ok: true, ...(data !== undefined && { data }) },
    { status: 201 }
  );
}

/**
 * Helper per risposta vuota di successo (es. DELETE)
 */
export function apiOk(): NextResponse<ApiSuccess> {
  logger.info("Operation completed successfully");
  return apiSuccess();
}

/**
 * Helper per errore 404 Not Found
 */
export function apiNotFound(
  message = "Resource not found",
  code: ApiErrorCode = ApiErrorCode.NOT_FOUND
): NextResponse<ApiError> {
  logger.warn(message, code);
  return apiError(message, undefined, 404, code);
}

/**
 * Helper per errore 409 Conflict
 */
export function apiConflict(
  message = "Resource conflict",
  details?: any,
  code: ApiErrorCode = ApiErrorCode.CONFLICT
): NextResponse<ApiError> {
  logger.warn(message, code, { details });
  return apiError(message, details, 409, code);
}

/**
 * Helper per errore 413 Payload Too Large
 */
export function apiPayloadTooLarge(
  message = "Payload too large",
  code: ApiErrorCode = ApiErrorCode.PAYLOAD_TOO_LARGE
): NextResponse<ApiError> {
  logger.warn(message, code);
  return apiError(message, undefined, 413, code);
}

/**
 * Helper per errore 415 Unsupported Media Type
 */
export function apiUnsupportedMediaType(
  message = "Unsupported media type",
  code: ApiErrorCode = ApiErrorCode.UNSUPPORTED_MEDIA_TYPE
): NextResponse<ApiError> {
  logger.warn(message, code);
  return apiError(message, undefined, 415, code);
}

/**
 * Helper per errore 500 Internal Server Error
 */
export function apiInternalError(
  message = "Internal server error",
  details?: any,
  code: ApiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR
): NextResponse<ApiError> {
  logger.error(message, code, { details });
  return apiError(message, details, 500, code);
}

/**
 * Utility per estrarre request ID dai headers per tracing
 */
export function getRequestId(request?: Request): string {
  if (!request) return generateRequestId();
  
  const requestId = request.headers.get("x-request-id") || 
                   request.headers.get("x-correlation-id") ||
                   generateRequestId();
  
  return requestId;
}

/**
 * Middleware per logging delle richieste
 */
export function logRequest(request: Request, response?: Response) {
  const requestId = getRequestId(request);
  const url = new URL(request.url);
  
  logger.info("Request processed", {
    method: request.method,
    url: url.pathname,
    status: response?.status,
    requestId,
  });
  
  return requestId;
}