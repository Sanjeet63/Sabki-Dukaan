import { badRequest } from '../shared/errors.js';

// Usage: validate({ body: schema, query: schema, params: schema })
// Validated data is available on req.valid.body / req.valid.query / req.valid.params.
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return next(badRequest(`Invalid ${key}`, details));
      }
      req.valid[key] = result.data;
    }
    next();
  };
}
