import { Injectable, Logger } from '@nestjs/common';

interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureTime: number;
    nextAttempt: number;
}

@Injectable()
export class CircuitBreakerService {
    private readonly logger = new Logger(CircuitBreakerService.name);
    private readonly circuits = new Map<string, CircuitBreakerState>();
    private readonly failureThreshold = 5;
    private readonly retryTimeout = 30000; // 30 segundos

    /**
     * Ejecuta una función con circuit breaker
     */
    async execute<T>(
        circuitName: string,
        fn: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        const circuit = this.getCircuit(circuitName);

        if (circuit.state === 'OPEN') {
            if (Date.now() > circuit.nextAttempt) {
                circuit.state = 'HALF_OPEN';
                this.logger.log(`Circuit ${circuitName} is now HALF_OPEN`);
            } else {
                this.logger.warn(`Circuit ${circuitName} is OPEN, using fallback`);
                if (fallback) {
                    return await fallback();
                }
                throw new Error(`Circuit ${circuitName} is OPEN`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess(circuitName);
            return result;
        } catch (error) {
            this.onFailure(circuitName);

            if (fallback && circuit.state === 'HALF_OPEN') {
                this.logger.warn(`Circuit ${circuitName} failed in HALF_OPEN, using fallback`);
                return await fallback();
            }

            throw error;
        }
    }

    private getCircuit(name: string): CircuitBreakerState {
        if (!this.circuits.has(name)) {
            this.circuits.set(name, {
                state: 'CLOSED',
                failures: 0,
                lastFailureTime: 0,
                nextAttempt: 0,
            });
        }
        return this.circuits.get(name)!;
    }

    private onSuccess(circuitName: string): void {
        const circuit = this.getCircuit(circuitName);
        circuit.failures = 0;
        circuit.state = 'CLOSED';
    }

    private onFailure(circuitName: string): void {
        const circuit = this.getCircuit(circuitName);
        circuit.failures++;
        circuit.lastFailureTime = Date.now();

        if (circuit.failures >= this.failureThreshold) {
            circuit.state = 'OPEN';
            circuit.nextAttempt = Date.now() + this.retryTimeout;
            this.logger.error(`Circuit ${circuitName} is now OPEN after ${circuit.failures} failures`);
        }
    }

    /**
     * Obtiene el estado de todos los circuits
     */
    getCircuitStates(): Record<string, CircuitBreakerState> {
        const states: Record<string, CircuitBreakerState> = {};
        for (const [name, state] of this.circuits.entries()) {
            states[name] = { ...state };
        }
        return states;
    }
}