export const decodeJwtPayload = (token: string) => {
    const parts = token.split(".");
    if (parts.length < 2) {
        throw new Error("invalid token");
    }
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = payload.length % 4;
    if (padding) {
        payload = payload.padEnd(payload.length + (4 - padding), "=");
    }
    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
};

export const getTenantIdFromToken = (token: string) => {
    const payload = decodeJwtPayload(token);
    return (payload["custom:tenant_id"] as string | undefined) ||
        (payload["tenant_id"] as string | undefined) ||
        (payload["cognito:username"] as string | undefined) ||
        (payload["sub"] as string | undefined) ||
        "";
};
