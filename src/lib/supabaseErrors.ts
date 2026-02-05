/**
 * Supabase Error Handling Utilities (P2 Enhancement F9)
 * 
 * Standardized error handling for Supabase operations with user-friendly messages.
 * Maps Postgres error codes to actionable feedback.
 */

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface ParsedError {
  message: string;
  isPermissionDenied: boolean;
  isNotFound: boolean;
  isUniqueViolation: boolean;
  isForeignKeyViolation: boolean;
  originalCode?: string;
}

/**
 * Postgres error codes we commonly encounter
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const ERROR_CODES = {
  // Class 23 - Integrity Constraint Violation
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  
  // Class 42 - Syntax Error or Access Rule Violation
  INSUFFICIENT_PRIVILEGE: '42501',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  
  // Class 53 - Insufficient Resources
  DISK_FULL: '53100',
  OUT_OF_MEMORY: '53200',
  
  // Class 08 - Connection Exception
  CONNECTION_FAILURE: '08006',
} as const;

/**
 * Parse a Supabase error into a structured format with user-friendly message
 */
export function parseSupabaseError(error: unknown): ParsedError {
  if (!error) {
    return {
      message: 'An unknown error occurred',
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
    };
  }

  const err = error as SupabaseError;
  const code = err.code;
  
  // Permission denied (RLS policy violation)
  if (code === ERROR_CODES.INSUFFICIENT_PRIVILEGE) {
    return {
      message: 'You do not have permission to perform this action',
      isPermissionDenied: true,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Table or record not found
  if (code === ERROR_CODES.UNDEFINED_TABLE) {
    return {
      message: 'Resource not found',
      isPermissionDenied: false,
      isNotFound: true,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Duplicate record (unique constraint)
  if (code === ERROR_CODES.UNIQUE_VIOLATION) {
    // Try to extract field name from message
    const fieldMatch = err.message?.match(/Key \(([^)]+)\)/);
    const field = fieldMatch ? fieldMatch[1] : 'record';
    
    return {
      message: `A ${field} with this value already exists`,
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: true,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Foreign key violation (referenced record doesn't exist)
  if (code === ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    return {
      message: 'The referenced record does not exist or has been deleted',
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: true,
      originalCode: code,
    };
  }

  // Not null violation
  if (code === ERROR_CODES.NOT_NULL_VIOLATION) {
    const fieldMatch = err.message?.match(/column "([^"]+)"/);
    const field = fieldMatch ? fieldMatch[1] : 'field';
    
    return {
      message: `${field} is required`,
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Check constraint violation
  if (code === ERROR_CODES.CHECK_VIOLATION) {
    return {
      message: err.details || err.hint || 'Invalid data provided',
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Connection failures
  if (code === ERROR_CODES.CONNECTION_FAILURE) {
    return {
      message: 'Unable to connect to database. Please try again.',
      isPermissionDenied: false,
      isNotFound: false,
      isUniqueViolation: false,
      isForeignKeyViolation: false,
      originalCode: code,
    };
  }

  // Default: use original message or generic fallback
  return {
    message: err.message || 'An error occurred while processing your request',
    isPermissionDenied: false,
    isNotFound: false,
    isUniqueViolation: false,
    isForeignKeyViolation: false,
    originalCode: code,
  };
}

/**
 * Quick check if an error is a permission denial
 */
export function isPermissionDenied(error: unknown): boolean {
  return (error as SupabaseError)?.code === ERROR_CODES.INSUFFICIENT_PRIVILEGE;
}

/**
 * Quick check if an error is a unique violation (duplicate)
 */
export function isDuplicateError(error: unknown): boolean {
  return (error as SupabaseError)?.code === ERROR_CODES.UNIQUE_VIOLATION;
}

/**
 * Extract user-friendly message from any Supabase error
 */
export function getErrorMessage(error: unknown): string {
  return parseSupabaseError(error).message;
}

/**
 * Log error with context (for debugging)
 */
export function logSupabaseError(error: unknown, context?: string): void {
  const parsed = parseSupabaseError(error);
  const prefix = context ? `[${context}]` : '[Supabase Error]';
  
  console.error(prefix, {
    message: parsed.message,
    code: parsed.originalCode,
    isPermissionDenied: parsed.isPermissionDenied,
    isUniqueViolation: parsed.isUniqueViolation,
  });
}
