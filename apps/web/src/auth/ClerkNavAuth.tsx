import { ClerkProvider, SignInButton, UserButton, useAuth } from '@clerk/react';
import { SIGN_IN_BUTTON } from './ui';

/**
 * Clerk's own sign-in modal, avatar menu and account screens (Profile, Security, Connected accounts).
 * Nothing here is re-drawn: Clerk renders and runs it all. This file is loaded on demand, so the
 * Clerk SDK stays out of the main bundle that every page downloads.
 */
export default function ClerkNavAuth({ publishableKey }: { publishableKey: string }) {
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <AuthControl />
    </ClerkProvider>
  );
}

function AuthControl() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="modal">
      <button type="button" className={SIGN_IN_BUTTON}>
        Sign in
      </button>
    </SignInButton>
  );
}
