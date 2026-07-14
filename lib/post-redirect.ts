import { NextResponse } from "next/server";

export const redirectAfterPost = (url: URL | string) => NextResponse.redirect(url, 303);
