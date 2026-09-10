// Only messages written by this application are safe to display verbatim.
export class StartupError extends Error {}

export function startupErrorMessage(error) {
  if (error instanceof StartupError) return error.message;
  if (error.code === 18 || error.codeName === 'AuthenticationFailed') {
    return 'MongoDB authentication failed. Check the database credentials in MONGO_URI.';
  }
  if (error.code === 11000) return 'Duplicate database records prevent index creation. Follow the migration steps in README.md.';
  if (error.code === 26) return 'Required database collections are missing. Run npm run db:indexes.';
  if (error.code === 'EADDRINUSE') return 'The configured PORT is already in use. Stop the other server or choose another PORT.';
  if (error.name === 'MongoParseError') return 'MONGO_URI is not a valid MongoDB connection string.';
  if (['MongoServerSelectionError', 'MongooseServerSelectionError'].includes(error.name) ||
      ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEOUT', 'ECONNRESET', 'ESERVFAIL'].includes(error.code)) {
    return 'Cannot reach MongoDB. Check that the database is running, DNS/network access works, and Atlas allows your IP address.';
  }
  return 'Startup failed. Check database connectivity and the configuration steps in README.md.';
}
