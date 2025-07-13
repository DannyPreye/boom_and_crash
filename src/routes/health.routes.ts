import { Router, Request, Response } from 'express';
import { DerivWebSocketService } from '@/services/deriv-websocket.service';
import { FeatureEngineeringService } from '@/services/feature-engineering.service';
import { GeminiAIService } from '@/services/gemini-ai.service';

const router = Router();

// Mock services for now - will be properly injected
let derivService: DerivWebSocketService | null = null;
let featureService: FeatureEngineeringService | null = null;
let geminiService: GeminiAIService | null = null;

/**
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) =>
{
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                database: 'healthy', // Will check Redis/DB when implemented
                deriv_api: derivService?.isConnected() ? 'connected' : 'disconnected',
                gemini_ai: 'available', // Will check API availability
                feature_engine: 'ready',
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req: Request, res: Response) =>
{
    try {
        const isReady = derivService?.isConnected() && featureService && geminiService;

        if (isReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                reason: 'Services not fully initialized',
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * Liveness probe for Kubernetes
 */
router.get('/live', async (req: Request, res: Response) =>
{
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});

export { router as healthRoutes };
