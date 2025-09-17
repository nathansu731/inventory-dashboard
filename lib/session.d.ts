import type { UserToken } from "./auth-utils";

declare module "iron-session" {
    interface IronSessionData {
        user?: UserToken;
        state?: string;
        nonce?: string;
    }
}