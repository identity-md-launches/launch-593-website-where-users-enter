import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { RESUME_KEY } from './auth';
import { Modal } from './components/Modal';
import { Submission } from './components/Submission';

function shouldResume() {
  try { return sessionStorage.getItem(RESUME_KEY) === '1'; } catch { return false; }
}

export default function App() {
  // Returning from the Twitter redirect reopens the submission dialog automatically.
  const [open, setOpen] = useState(shouldResume);
  useEffect(() => { if (open) try { sessionStorage.removeItem(RESUME_KEY); } catch { /* storage unavailable */ } }, [open]);

  return <>
    <div className="backdrop" aria-hidden="true">
      <img src="./images/pepe-squad.webp" width="1536" height="1024" alt="" decoding="async" fetchPriority="high" />
    </div>
    <main id="main" className="stage">
      <h1 className="sr-only">Pepe Collective</h1>
      <button type="button" className="button button-primary submit-button" onClick={() => setOpen(true)}>Submit a project<ArrowUpRight size={22} aria-hidden="true" /></button>
    </main>
    {open && <Modal title="Submit a project" onClose={() => setOpen(false)}><Submission onClose={() => setOpen(false)} /></Modal>}
  </>;
}
