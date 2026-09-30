export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-bad-line bg-bad-bg p-5 text-bad">
      <p className="font-semibold">Could not load the lab database</p>
      <pre className="mt-2 font-mono text-sm whitespace-pre-wrap">{message}</pre>
      <button type="button" onClick={onRetry} className="mt-4 rounded-md bg-inverse px-4 py-2 text-sm font-semibold text-on-inverse">
        Retry
      </button>
    </div>
  );
}
