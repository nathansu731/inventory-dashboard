import { Issuer, Client } from 'openid-client';

let client: Client | null = null;

export async function getCognitoClient(): Promise<Client> {
    if (client) return client;

    const issuer = await Issuer.discover(
        `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
    );

    client = new issuer.Client({
        client_id: process.env.COGNITO_CLIENT_ID!,
        client_secret: process.env.COGNITO_CLIENT_SECRET!,
        redirect_uris: [process.env.COGNITO_REDIRECT_URI!],
        response_types: ['code'],
    });

    return client;
}