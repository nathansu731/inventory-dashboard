declare module "openid-client/helpers" {
    export const generators: {
        state: () => string;
        nonce: () => string;
    };
}