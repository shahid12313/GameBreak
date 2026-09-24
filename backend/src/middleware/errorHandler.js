'use strict';
/* Centralised error handler. Mongoose validation/cast errors and our own
   thrown {status, message} objects all funnel through here into a
   consistent {error: "..."} JSON body instead of leaking stack traces. */
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: (first && first.message) || 'Invalid data.' });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'That id does not look right.' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.expose ? err.message : 'Something went wrong on our end.' });
};

module.exports.httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
