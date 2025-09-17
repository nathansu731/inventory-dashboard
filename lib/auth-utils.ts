import { jwtDecode } from 'jwt-decode';
import { getCognitoClient } from './openid-client';
import { NextApiRequest } from 'next';
import { IronSession } from 'iron-session';

export type UserToken = {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt: number; // timestamp in seconds
};

type DecodedToken = {
    exp: number; // expiry in seconds since epoch
    [key: string]: any;
};

// Check if JWT token is expired
export function isTokenExpired(token: string): boolean {
    try {
        const decoded: DecodedToken = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    } catch (err) {
        console.error('Failed to decode token', err);
        return true;
    }
}

// Store token info in session
export async function storeTokenInSession(
    req: NextApiRequest & { session: IronSession<{ user?: UserToken }> },
    tokenSet: any
) {
    const expiresAt = Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 3600);

    req.session.user = {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        idToken: tokenSet.id_token,
        expiresAt,
    };

    await req.session.save();
}

// Refresh access token if expired
export async function refreshTokenIfNeeded(
    req: NextApiRequest & { session: IronSession<{ user?: UserToken }> }
) {
    if (!req.session.user?.refreshToken) return;

    const { user } = req.session;

    if (user && isTokenExpired(user.accessToken)) {
        try {
            const client = await getCognitoClient();
            const tokenSet = await client.refresh(user.refreshToken!);

            const expiresAt = Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 3600);

            if (!tokenSet.access_token) throw new Error('Missing access token');
            req.session.user = {
                accessToken: tokenSet.access_token,
                refreshToken: tokenSet.refresh_token || user.refreshToken,
                idToken: tokenSet.id_token,
                expiresAt,
            };

            await req.session.save();
        } catch (err) {
            console.error('Failed to refresh token', err);
            req.session.user = undefined;
            await req.session.save();
        }
    }
}