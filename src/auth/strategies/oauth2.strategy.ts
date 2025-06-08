import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OAuth2Strategy extends PassportStrategy(Strategy, 'oauth2') {
    constructor(private readonly configService: ConfigService) {
        super({
            authorizationURL: configService.get<string>('oauth2.authorizationUrl', ''),
            tokenURL: configService.get<string>('oauth2.tokenUrl', ''),
            clientID: configService.get<string>('oauth2.clientId', ''),
            clientSecret: configService.get<string>('oauth2.clientSecret', ''),
            callbackURL: configService.get<string>('oauth2.redirectUrl', ''),
            scope: configService.get<string>('oauth2.scope', ''),
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
        return {
            accessToken,
            refreshToken,
            user: {
                id: profile.id,
                email: profile.emails?.[0]?.value,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
            },
        };
    }

    authorizationUrl(): string {
        // Construct and return the OAuth2 authorization URL here
        // Example placeholder:
        return '';
    }
}