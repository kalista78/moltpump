import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { ValidationError, isAppError, formatError } from '../utils/errors.js';
import { env } from '../config/env.js';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, string[]>;
  };
}

export function errorHandler(err: Error, c: Context): Response {
  // Log error in development
  if (env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  let statusCode = 500;
  let response: ErrorResponse = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    statusCode = 400;
    response = {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      },
    };
  }
  // Handle our custom errors
  else if (isAppError(err)) {
    const formatted = formatError(err);
    statusCode = formatted.statusCode;
    response = {
      success: false,
      error: {
        message: formatted.message,
        code: formatted.code,
      },
    };

    // Include validation details if available
    if (err instanceof ValidationError && err.details) {
      response.error.details = err.details;
    }
  }
  // Handle Hono HTTP exceptions
  else if (err instanceof HTTPException) {
    statusCode = err.status;
    response = {
      success: false,
      error: {
        message: err.message || 'HTTP error',
        code: `HTTP_${err.status}`,
      },
    };
  }
  // Handle generic errors
  else if (err instanceof Error) {
    // Don't expose internal error messages in production
    response = {
      success: false,
      error: {
        message: env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
        code: 'INTERNAL_ERROR',
      },
    };
  }

  return c.json(response, statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502);
}

// Not found handler for undefined routes
export function notFoundHandler(c: Context): Response {
  return c.json(
    {
      success: false,
      error: {
        message: `Route ${c.req.method} ${c.req.path} not found`,
        code: 'NOT_FOUND',
      },
    },
    404
  );
}
