/**
 * Validates req[source] against a Zod schema and stores the parsed result on
 * req.valid[source]. (Express 5 makes req.query read-only, so we don't overwrite it.)
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = result.error.issues.map((i) => ({
      field: i.path.join('.') || source,
      message: i.message,
    }));
    return next(err);
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};
