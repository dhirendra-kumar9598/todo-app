const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Every request must carry an anonymous client id (a UUID the frontend generates once and
 * keeps in localStorage). Tasks are scoped to it, so visitors don't see each other's lists.
 */
export const requireClient = (req, _res, next) => {
  const id = req.get('X-Client-Id');
  if (!id || !UUID.test(id)) {
    const err = new Error('Missing or invalid X-Client-Id header');
    err.status = 400;
    return next(err);
  }
  req.clientId = id.toLowerCase();
  next();
};
