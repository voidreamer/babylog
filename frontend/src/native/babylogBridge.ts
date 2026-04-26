import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SetSessionPayload {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    apiBaseUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
}

export interface SetSelectedBabyPayload {
    babyId: number;
    babyName: string;
}

export interface PendingAction {
    type: string;
    endpoint: string;
    method: string;
    data: unknown;
    created_at: string;
}

export interface BabylogBridgePlugin {
    setSession(payload: SetSessionPayload): Promise<void>;
    clearSession(): Promise<void>;
    setSelectedBaby(payload: SetSelectedBabyPayload): Promise<void>;
    drainPendingActions(): Promise<{ actions: PendingAction[] }>;
}

const Native = registerPlugin<BabylogBridgePlugin>('BabylogBridge');

const noop = async () => { /* web no-op */ };

export const BabylogBridge: BabylogBridgePlugin =
    Capacitor.getPlatform() === 'ios'
        ? Native
        : {
            setSession: noop,
            clearSession: noop,
            setSelectedBaby: noop,
            drainPendingActions: async () => ({ actions: [] }),
        };
