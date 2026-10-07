import { useAuth } from './AuthProvider';
import { UserMenu } from './UserMenu';
import { SIGN_IN_BUTTON } from './ui';

/** The navbar control for the fake development sign-in. Never part of a production build. */
export default function DevAuthControl() {
  const { isSignedIn, openSignIn } = useAuth();
  if (isSignedIn) return <UserMenu />;
  return (
    <button type="button" onClick={openSignIn} className={SIGN_IN_BUTTON}>
      Sign in
    </button>
  );
}
