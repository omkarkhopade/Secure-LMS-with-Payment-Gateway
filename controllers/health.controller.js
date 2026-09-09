import { get } from 'mongoose';
import { getDBStatus } from '../database/db.js';

export const checkHealth = async (req, res) => {
    try {
        const dbStatus = getDBStatus();
    
        const healthStatus = {
            status: 'OK',
            timeStamp: new Date().toISOString(),
            services: {
                database: {
                    status: dbStatus.isConnected ? 'healthy' : 'unhealthy',
                    details: {
                        ...dbstatus,
                        readyState : getReadyStateText(dbStatus.readyState)
                       }
                },
                server: {
                    status: 'healthy',
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                }
            }
        }
    
        const httpStatus = healthStatus.services.database.status === 'healthy' ? 
        200 : 503
        res.status(httpStatus).json(healthStatus)
    } catch (error) {
        console.error('Health check Failed' , error)
        res.status(500).json({
            status: 'ERROR',
            timeStamp: new Date().toISOString(),
            error: error.message
        })
    }
};

function getReadyStateText(state) {
    // TODO: Implement get ready state text functionality
}
