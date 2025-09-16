let client: any = null;

export async function getCognitoClient() {
    if (client) return client;

    // Dynamic import
    const OpenIDClient: any = await import("openid-client");

    // Discover issuer
    const issuer = await OpenIDClient.Issuer.discover(process.env.NEXT_PUBLIC_COGNITO_ISSUER!);

    client = new issuer.Client({
        client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        client_secret: process.env.COGNITO_CLIENT_SECRET!, // server-only
        redirect_uris: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI!],
        response_types: ["code"],
    });

    return client;
}