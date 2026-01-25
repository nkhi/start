import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// =============================================================================
// Service Management Logic
// =============================================================================

class CapService {
    private static instance: CapService;
    private lastActivity: number;
    private shutdownInterval: NodeJS.Timeout | null;

    private readonly INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    private readonly SHUTDOWN_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

    private constructor() {
        this.lastActivity = Date.now();
        this.shutdownInterval = null;
    }

    public static getInstance(): CapService {
        if (!CapService.instance) {
            CapService.instance = new CapService();
        }
        return CapService.instance;
    }

    /**
     * Check if Cap services are currently running
     */
    public async isRunning(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('docker compose ps cap-web --format json');

            if (!stdout.trim()) {
                return false;
            }

            // Handle both single object and stream of objects
            const output = stdout.trim();
            const containers = output.includes('\n')
                ? output.split('\n').map(line => JSON.parse(line))
                : [JSON.parse(output)];

            const capWeb = containers.find(c => c.Service === 'cap-web');
            return capWeb?.State === 'running';
        } catch (error) {
            console.error('[CAP] Error checking status:', error);
            // If checking status fails, assume not running to be safe? 
            // Or log strictly. In this context, false is safer for UI.
            return false;
        }
    }

    /**
     * Start Cap Docker services
     */
    public async start(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[CAP] 🚀 Starting Cap services...');

            // Use --pull=never to avoid pulling images on every start
            await execAsync('docker compose --profile cap up -d --pull=never');

            this.startAutoShutdownMonitor();
            this.bumpActivity();

            console.log('[CAP] ✅ Cap services started successfully');
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if error is due to missing images
            if (errorMessage.includes('pull access denied') || errorMessage.includes('not found')) {
                console.error('[CAP] ❌ Missing Docker images. Run: docker compose --profile cap pull');
                return {
                    success: false,
                    error: 'Docker images not found. Please run: docker compose --profile cap pull'
                };
            }

            console.error('[CAP] ❌ Failed to start Cap services:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Stop Cap Docker services
     */
    public async stop(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[CAP] 🛑 Stopping Cap services...');

            await execAsync('docker compose stop cap-web cap-mysql cap-minio');

            this.stopAutoShutdownMonitor();

            console.log('[CAP] ✅ Cap services stopped successfully');
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[CAP] ❌ Failed to stop Cap services:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Update activity timestamp
     */
    public bumpActivity(): void {
        this.lastActivity = Date.now();
    }

    /**
     * Get current status details
     */
    public async getStatusDetails() {
        return {
            running: await this.isRunning(),
            lastActivity: this.lastActivity,
            inactiveMs: Date.now() - this.lastActivity
        };
    }

    private startAutoShutdownMonitor() {
        this.stopAutoShutdownMonitor(); // Clear existing

        this.shutdownInterval = setInterval(async () => {
            const inactiveMs = Date.now() - this.lastActivity;

            if (inactiveMs > this.INACTIVITY_TIMEOUT_MS) {
                const inactiveMinutes = Math.floor(inactiveMs / 60000);
                console.log(`[CAP] ⏰ Auto-shutdown triggered (${inactiveMinutes} minutes of inactivity)`);
                await this.stop();
            }
        }, this.SHUTDOWN_CHECK_INTERVAL_MS);
    }

    private stopAutoShutdownMonitor() {
        if (this.shutdownInterval) {
            clearInterval(this.shutdownInterval);
            this.shutdownInterval = null;
        }
    }
}

const capService = CapService.getInstance();

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * GET /api/services/cap/status
 */
router.get('/cap/status', async (_req: Request, res: Response) => {
    try {
        const details = await capService.getStatusDetails();
        res.json(details);
    } catch (error) {
        console.error('[CAP] Error in status endpoint:', error);
        res.status(500).json({
            running: false,
            error: 'Failed to check Cap status'
        });
    }
});

/**
 * POST /api/services/cap/start
 */
router.post('/cap/start', async (_req: Request, res: Response) => {
    try {
        const running = await capService.isRunning();
        if (running) {
            return res.json({
                success: true,
                message: 'Cap services are already running'
            });
        }

        const result = await capService.start();

        if (result.success) {
            res.json({ success: true, message: 'Cap services started successfully' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CAP] Error in start endpoint:', error);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

/**
 * POST /api/services/cap/stop
 */
router.post('/cap/stop', async (_req: Request, res: Response) => {
    try {
        const result = await capService.stop();

        if (result.success) {
            res.json({ success: true, message: 'Cap services stopped successfully' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CAP] Error in stop endpoint:', error);
        res.status(500).json({ success: false, error: errorMessage });
    }
});

/**
 * POST /api/services/cap/activity
 */
router.post('/cap/activity', (_req: Request, res: Response) => {
    capService.bumpActivity();
    res.json({ success: true });
});

export default router;
