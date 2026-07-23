import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/ValidationError';

/**
 * Validation middleware factory
 * Runs fifth in middleware chain (after requirePermission)
 *
 * Usage: validate({ body: loginSchema })
 */
export function validate(
  optionsOrData: any,
  schema?: ZodSchema
) {
  // Inline/direct validation style: validate(req.body, schema)
  if (schema) {
    const result = schema.safeParse(optionsOrData);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      console.log('--- DIRECT VALIDATION ERROR ---', JSON.stringify(errors, null, 2));
      throw new ValidationError('Validation failed', { body: errors });
    }
    return result.data;
  }

  // Middleware factory style: validate({ body: schema })
  const options = optionsOrData;
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip validation for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const errors: Record<string, unknown> = {};

    // Validate body
    if (options.body) {
      const result = options.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error.flatten().fieldErrors;
      }
    }

    // Validate query
    if (options.query) {
      const result = options.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error.flatten().fieldErrors;
      }
    }

    // Validate params
    if (options.params) {
      const result = options.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error.flatten().fieldErrors;
      }
    }

    // If there are errors, throw
    if (Object.keys(errors).length > 0) {
      console.log('--- MIDDLEWARE VALIDATION ERROR ---', JSON.stringify(errors, null, 2));
      throw new ValidationError('Validation failed', errors);
    }

    next();
  };
}
