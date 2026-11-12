import { request, setAccessToken } from "../client";

// Exemple d'intégration auth-service. Le formulaire de login reste à raccorder.
export interface SessionUser {
    id: string;
    email: string;
    roles: string[];
}
export async function getCurrentUser(): Promise<SessionUser> {
    return request<SessionUser>("/auth/me", {}, "auth");
}
export function useBearerToken(token: string | null): void {
    setAccessToken(token);
}
