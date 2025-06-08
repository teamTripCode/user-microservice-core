import 'express-session';

declare module 'express-session' {
    export interface SessionData {
        accessToken?: string;
        refreshToken?: string;
        user?: {
            sub: string;
            email: string;
            roles: string[];
            permissions: string[];
        }
    }
}