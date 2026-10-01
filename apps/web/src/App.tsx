import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { Navbar } from './components/Navbar';
import { NotFound } from './components/NotFound';
import { PageLoader } from './components/PageLoader';
import { HomePage } from './home/HomePage';

// The lab screen pulls in Monaco and the database worker; keep them out of the home page's bundle.
const LabRoute = lazy(() => import('./lab/LabRoute').then((m) => ({ default: m.LabRoute })));

export function App() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <Navbar />
      <Suspense
        fallback={
          <div className="h-[calc(100dvh_-_var(--navbar-height))]">
            <PageLoader label="Loading lab…" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:labId" element={<LabRoute />} />
          <Route path="/:labId/:tab/:itemId" element={<LabRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}
