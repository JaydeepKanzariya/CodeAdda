import { Link } from 'react-router';
import { labs } from '../content/registry';

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">That lab or lesson does not exist.</p>
      {labs[0] && (
        <Link to={`/${labs[0].id}`} className="mt-6 inline-block rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
          Go to {labs[0].title}
        </Link>
      )}
    </div>
  );
}
