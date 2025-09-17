import { SessionOptions } from "iron-session";
import { UserToken } from "./auth-utils";

export interface SessionData {
    user?: UserToken;
    state?: string;
    nonce?: string;
}

export const sessionOptions: SessionOptions = {
    password: process.env.SESSION_PASSWORD || "complex_password_at_least_32_chars",
    cookieName: "inventory_dashboard_session",
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
    },
};