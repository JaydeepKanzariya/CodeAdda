import { Navigate, Route, Routes } from 'react-router';
import { labs } from './content/registry';
import { Navbar } from './components/Navbar';
import { NotFound } from './components/NotFound';
import { LabRoute } from './lab/LabRoute';

function Home() {
  return labs[0] ? <Navigate to={`/${labs[0].id}`} replace /> : <p className="p-6">No labs found in content/.</p>;
}

export function App() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:labId" element={<LabRoute />} />
        <Route path="/:labId/:tab/:itemId" element={<LabRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
