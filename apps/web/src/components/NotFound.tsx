import { Link } from 'react-router';
import { labs } from '../content/registry';

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That lab or lesson does not exist.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {labs[0] && (
          <Link to={`/${labs[0].id}`} className="inline-block rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
            Go to {labs[0].title}
          </Link>
        )}
        <Link to="/" className="inline-block rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-subtle">
          Back to home
        </Link>
      </div>
    </div>
  );
}
