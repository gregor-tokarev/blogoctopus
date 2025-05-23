import { Resend } from "resend";
import { serverEnv } from "~/env/server";

export const resendClient = new Resend(serverEnv.RESEND_API_KEY);

export const NOREPLY_EMAIL = "noreply@blogoctopus.tokarev.work";
