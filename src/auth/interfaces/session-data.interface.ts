export interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    user?: {
        sub: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
}