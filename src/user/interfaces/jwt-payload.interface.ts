export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
    iat?: number;
    exp?: number;
}