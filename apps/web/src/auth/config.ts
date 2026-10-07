/** Clerk publishable keys start with `pk_`. A secret key (`sk_`) must never be used, or shipped, in the browser. */
export function isValidClerkKey(key: string | undefined): key is string {
  return Boolean(key && key.startsWith('pk_'));
}

const configuredKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();

export const clerkKey: string | undefined = isValidClerkKey(configuredKey) ? configuredKey : undefined;
export const hasValidClerkKey = clerkKey !== undefined;
