import { registerAs } from '@nestjs/config';

export default registerAs('oauth', () => ({
    oauth2: {
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL,
        tokenUrl: process.env.OAUTH_TOKEN_URL,
        redirectUrl: process.env.OAUTH_REDIRECT_URL,
        scope: ['openid', 'profile', 'email'],
    },
}));