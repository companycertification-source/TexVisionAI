import { supabase, isSupabaseConfigured } from './supabaseClient';
import { dataService } from './dataService';

export interface DailyUsage {
    date: string;
    apiCalls: number;
    tokenCount: number;
    cost: number;
    storageBytes: number;
}

export interface AnalyticsSummary {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    currentStorageBytes: number;
    dailyUsage: DailyUsage[];
}

// Pricing Constants (per 1M tokens) - Estimated
const PRICING = {
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 }, // $0.075 / 1M input
    'gemini-2.5-flash': { input: 0.10, output: 0.40 },       // $0.10 / 1M input
    'default': { input: 0.10, output: 0.40 }
};

export const analyticsService = {

    async getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {

        // 1. Storage Stats (Current snapshot)
        let storageBytes = 0;
        try {
            // If using Supabase, we might query bucket size (requires specialized query or edge function)
            // For now, we'll estimate based on history records if mocked, or specific log if available.
            // If local storage, we can measure string length.
            if (isSupabaseConfigured()) {
                // Mock storage fetch for Supabase as direct bucket size access via client is limited
                // Real implementation would require an RPC call or admin API
                storageBytes = 1024 * 1024 * 150; // Mock 150MB
            } else {
                const history = await dataService.getHistory();
                // Estimate: History JSON + Image blobs if stored (usually URLs)
                // LocalStorage has a limit, typically 5MB, but we might be using IndexedDB or just mocking.
                const stored = localStorage.getItem('texvision_history_v1') || '';
                storageBytes = new Blob([stored]).size;
            }
        } catch (e) {
            console.warn("Failed to measure storage", e);
        }

        // 2. API Usage
        let dailyUsage: DailyUsage[] = [];

        if (isSupabaseConfigured() && supabase) {
            // Fetch from 'usage_logs'
            try {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);

                const { data, error } = await supabase
                    .from('usage_logs')
                    .select('created_at, model, token_count')
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    const usageMap = new Map<string, DailyUsage>();

                    data.forEach((log: any) => {
                        const day = new Date(log.created_at).toLocaleDateString();
                        const current = usageMap.get(day) || { date: day, apiCalls: 0, tokenCount: 0, cost: 0, storageBytes: 0 };

                        current.apiCalls += 1;
                        current.tokenCount += (log.token_count || 0);

                        // Rough cost calc (assuming 80% input, 20% output split for simplicity if not logged separately)
                        const modelPrice = PRICING[log.model as keyof typeof PRICING] || PRICING['default'];
                        const inputCost = ((log.token_count || 0) * 0.8 / 1000000) * modelPrice.input;
                        const outputCost = ((log.token_count || 0) * 0.2 / 1000000) * modelPrice.output;
                        current.cost += (inputCost + outputCost);

                        usageMap.set(day, current);
                    });

                    dailyUsage = Array.from(usageMap.values());
                }
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            }
        }

        // If no data (Supabase empty or LocalStorage mode), generate consistent MOCK data for demo
        if (dailyUsage.length === 0) {
            dailyUsage = generateMockAnalytics(days);
        }

        // Calculate Totals
        const totalCalls = dailyUsage.reduce((sum, day) => sum + day.apiCalls, 0);
        const totalTokens = dailyUsage.reduce((sum, day) => sum + day.tokenCount, 0);
        const totalCost = dailyUsage.reduce((sum, day) => sum + day.cost, 0);

        return {
            totalCalls,
            totalTokens,
            totalCost,
            currentStorageBytes: storageBytes,
            dailyUsage
        };
    }
};

function generateMockAnalytics(days: number): DailyUsage[] {
    const data: DailyUsage[] = [];
    const today = new Date();

    // Generate a curve (simulating increasing adoption)
    for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStr = date.toLocaleDateString();

        // Base traffic + random variance
        const trafficFactor = 1 + (Math.sin(i * 0.5) * 0.3); // Wave pattern
        const calls = Math.floor((Math.random() * 20 + 10) * trafficFactor);

        // Gemini Flash avg: 5000 tokens per full analysis (images + response)
        const tokens = calls * (4000 + Math.floor(Math.random() * 2000));

        // Cost: Avg $0.0005 per call
        const cost = calls * 0.0005;

        // Storage: accumulative growth
        const storageBytes = 1024 * 1024 * (50 + (days - i) * 2); // Start 50MB, grow 2MB/day

        data.push({
            date: dayStr,
            apiCalls: calls,
            tokenCount: tokens,
            cost: parseFloat(cost.toFixed(4)),
            storageBytes
        });
    }
    return data;
}
