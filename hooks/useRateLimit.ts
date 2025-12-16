import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for rate limiting / debouncing actions
 * Prevents rapid repeated calls to expensive operations like API calls
 */
export function useRateLimit(delay: number = 2000) {
    const [isLimited, setIsLimited] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCooldown = useCallback(() => {
        setIsLimited(true);
        setCooldownRemaining(Math.ceil(delay / 1000));

        // Update countdown every second
        intervalRef.current = setInterval(() => {
            setCooldownRemaining(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Reset after delay
        timeoutRef.current = setTimeout(() => {
            setIsLimited(false);
            setCooldownRemaining(0);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }, delay);
    }, [delay]);

    const reset = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setIsLimited(false);
        setCooldownRemaining(0);
    }, []);

    /**
     * Wraps an async function with rate limiting
     * Returns a new function that only executes if not rate limited
     */
    const rateLimitedAction = useCallback(
        <T extends (...args: unknown[]) => Promise<unknown>>(action: T) => {
            return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
                if (isLimited) {
                    return null;
                }
                startCooldown();
                try {
                    return await action(...args) as ReturnType<T>;
                } catch (error) {
                    reset(); // Reset on error so user can retry
                    throw error;
                }
            };
        },
        [isLimited, startCooldown, reset]
    );

    return {
        isLimited,
        cooldownRemaining,
        startCooldown,
        reset,
        rateLimitedAction,
    };
}

/**
 * Simple debounce hook for search inputs etc.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    // Using useEffect inline to avoid import issues
    useState(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    });

    return debouncedValue;
}

/**
 * Throttle hook - allows action once per interval
 */
export function useThrottle(interval: number = 1000) {
    const lastCall = useRef<number>(0);

    const throttledAction = useCallback(
        <T extends (...args: unknown[]) => unknown>(action: T) => {
            return (...args: Parameters<T>): ReturnType<T> | null => {
                const now = Date.now();
                if (now - lastCall.current >= interval) {
                    lastCall.current = now;
                    return action(...args) as ReturnType<T>;
                }
                return null;
            };
        },
        [interval]
    );

    return { throttledAction };
}

export default useRateLimit;
