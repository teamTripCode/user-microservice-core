export interface OAuth2Result {
    accessToken: string;
    refreshToken?: string;
    user: {
        sub: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
    expiresAt: number;
}
