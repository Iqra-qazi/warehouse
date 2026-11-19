export function getMongoDatabaseName(connectionString) {
  if (typeof connectionString !== "string") return null;
  const match = connectionString.trim().match(
    /^mongodb(?:\+srv)?:\/\/(?:[^/?#@]+@)?[^/?#]+\/([^/?#]+)(?:[?#]|$)/i
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function isQaDatabase(connectionString) {
  const databaseName = getMongoDatabaseName(connectionString);
  return Boolean(databaseName && /(?:_qa|_test)$/i.test(databaseName));
}

export function assertQaDatabase(connectionString, operation) {
  if (isQaDatabase(connectionString)) return true;
  console.error(
    `${operation}: Refusing to run. MONGO_URI database name must end with "_qa" or "_test". No data was changed.`
  );
  return false;
}
