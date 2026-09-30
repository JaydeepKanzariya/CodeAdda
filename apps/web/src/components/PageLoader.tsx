export function PageLoader({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="grid h-full place-items-center bg-page">
      <div className="flex flex-col items-center">
        <div className="page-spinner" aria-hidden="true" />
        <p className="mt-4 text-base text-muted">{label}</p>
      </div>
    </div>
  );
}
