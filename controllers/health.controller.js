import { getDBStatus } from '../database/db.js';
export const checkHealth = (req, res) => {
  const { isConnected } = getDBStatus();
  res.status(isConnected ? 200 : 503).json({ status: isConnected ? 'OK' : 'UNAVAILABLE', timeStamp: new Date().toISOString(), services: { database: { status: isConnected ? 'healthy' : 'unhealthy' } } });
};
