import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, Copy, Globe2, Leaf, LogOut, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { useAuth } from './auth';
import { backendConfig, hasBackend } from './config';
import { fetchProjects, type Project } from './lib/submissions';
import { categories, categoryFor, exampleProjects, filterProjects, type Category, type DisplayProject } from './lib/projects';
import { Modal } from './components/Modal';
import { FrogMark, ProjectMark, XMark } from './components/Marks';
import { Submission } from './components/Submission';

type Info = 'how' | 'collective' | 'public';

function ProjectCard({ project, index, open }: { project: DisplayProject; index: number; open: () => void }) {
  return <article className="project-card">
    <div className="card-top"><ProjectMark index={project.mark ?? index} /><span className="category-label">{categoryFor(project)}</span></div>
    <h3><button className="project-title" onClick={open}>{project.name || project.projectUsername}<ArrowUpRight size={19} /></button></h3>
    <span className="project-handle">@{project.projectUsername}</span>
    <p className="project-description">{project.description}</p>
    <div className="card-bottom"><span className="builder"><XMark /><span>@{project.twitterUsername}</span>{!project.example && <CheckCircle2 size={13} aria-label="Twitter authenticated" />}</span><span className="card-type">{project.example ? 'Example' : 'Public'}</span></div>
  </article>;
}

function ProjectDetail({ project, announce }: { project: DisplayProject; announce: (message: string) => void }) {
  const [copied, setCopied] = useState('');
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopied(label); announce(`${label} copied.`); }
    catch { announce('Copy is unavailable. Select and copy the full address below.'); }
  }
  return <div className="project-detail">
    <div className="detail-intro"><ProjectMark index={project.mark} /><div><span className="category-label">{categoryFor(project)}</span><p>@{project.projectUsername}</p></div></div>
    {project.example && <div className="example-notice">This is an example project, not a real submission. Accounts and addresses are illustrative.</div>}
    <h3>About the project</h3><p className="detail-description">{project.description}</p>
    <dl><div><dt>Twitter account</dt><dd>{project.example ? `@${project.twitterUsername}` : <a href={`https://x.com/${encodeURIComponent(project.twitterUsername)}`} target="_blank" rel="noopener noreferrer">@{project.twitterUsername}<ArrowUpRight size={15} /><span className="sr-only"> (opens in a new tab)</span></a>}</dd></div><div><dt>Project username</dt><dd>@{project.projectUsername}</dd></div>{(['contract', 'wallet'] as const).map(field => <div key={field}><dt>{field === 'contract' ? 'Contract address' : 'Wallet address'}</dt><dd className="address-value"><code>{project[field]}</code><button className="icon-button" onClick={() => copy(project[field], field === 'contract' ? 'Contract' : 'Wallet')} aria-label={`Copy ${field} address`}>{copied.toLowerCase() === field ? <Check size={17} /> : <Copy size={17} />}</button></dd></div>)}</dl>
    <p className="detail-footer"><Globe2 size={15} />{project.example ? 'Example from the preview directory' : `Publicly submitted ${new Date(project.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}`}</p>
    {!project.example && <p className="field-hint">Twitter authentication confirms the account, not ownership of the contract or wallet.</p>}
  </div>;
}

function Information({ type, submit }: { type: Info; submit: () => void }) {
  if (type === 'how') return <div className="info-content"><p>A few details connect your work to a whole collective.</p><ol className="how-steps"><li><span>01</span><div><h3>Start with your Twitter</h3><p>Sign in securely with Privy. Your verified account becomes the face behind your project.</p></div></li><li><span>02</span><div><h3>Share what you’re building</h3><p>Add your project username, EVM contract address, a description, and your public EVM wallet address.</p></div></li><li><span>03</span><div><h3>Join the public directory</h3><p>Confirm you’re ready to share. All five details go public so anyone can discover your work.</p></div></li></ol><button className="button button-primary" onClick={submit}>Submit your project<ArrowRight size={17} /></button></div>;
  if (type === 'public') return <div className="info-content"><p>Every published project can be read without signing in. The directory displays all five submitted details: Twitter account, project username, contract address, project information, and wallet address.</p><h3>Share only public information</h3><p>Use a public wallet address. Never enter seed phrases, private keys, or confidential project information. Signing in alone does not publish a project.</p><h3>What verification means</h3><p>Privy verifies access to your Twitter account. The directory does not verify ownership of your contract or wallet and does not endorse listed projects.</p><h3>About this preview</h3><p>When live services are not configured, the directory shows clearly labeled fictional examples. Examples are never represented as public submissions. The preview does not save your form data.</p></div>;
  return <div className="info-content"><div className="about-symbol"><FrogMark /></div><h3>Small frogs. Shared ambition.</h3><p>Pepe Collective is a gathering place for people making things with AI. The experimenters. The late-night builders. The ones who think a good idea gets better when you share it.</p><p>Find a project that sparks something. Meet the person behind it. Bring your own corner of the internet to the pond.</p><div className="public-callout"><Leaf size={21} /><p>Independent builders. Open projects.<br /><strong>A little more possible, together.</strong></p></div></div>;
}

export default function App() {
  const auth = useAuth();
  const [projects, setProjects] = useState<DisplayProject[]>(hasBackend ? [] : exampleProjects);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All projects');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(hasBackend);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<DisplayProject | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const reload = useCallback(async () => {
    if (!hasBackend) return;
    setLoading(true); setLoadError('');
    try { setProjects(await fetchProjects(backendConfig)); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Unable to load the directory. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const filtered = useMemo(() => filterProjects(projects, query, category, sort), [projects, query, category, sort]);
  function openSubmit() { setInfo(null); setMobileNav(false); setSubmitting(true); }
  function publish(project: Project) { setProjects(current => [project, ...current.filter(item => item.id !== project.id)]); setQuery(''); setCategory('All projects'); setSort('newest'); }

  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="#" aria-label="Pepe Collective home"><span className="brand-icon"><FrogMark /></span><span>pepe<span className="brand-second">collective</span><span className="brand-dot">.</span></span></a>
      <nav className={`navigation ${mobileNav ? 'nav-open' : ''}`} aria-label="Main navigation"><a href="#projects" className="nav-active" onClick={() => setMobileNav(false)}>Explore projects</a><button onClick={() => { setInfo('how'); setMobileNav(false); }}>How it works</button><button onClick={() => { setInfo('collective'); setMobileNav(false); }}>The collective<ArrowUpRight size={13} /></button></nav>
      <div className="header-actions">{auth.authenticated && auth.twitterUsername ? <button className="button button-signin account-button" onClick={async () => { try { await auth.logout(); setNotice('You have signed out.'); } catch { setNotice('Unable to sign out. Please try again.'); } }}><span>@{auth.twitterUsername}</span><LogOut size={16} /><span className="sr-only">Sign out</span></button> : <button className="button button-signin" onClick={openSubmit}><XMark /><span>Sign in<span className="signin-long"> with Twitter</span></span></button>}<button className="mobile-menu icon-button" aria-expanded={mobileNav} aria-controls="mobile-nav" aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X size={22} /> : <span className="menu-lines" />}</button></div>
    </div>{mobileNav && <nav id="mobile-nav" className="mobile-navigation" aria-label="Mobile navigation"><a href="#projects" onClick={() => setMobileNav(false)}>Explore projects</a><button onClick={() => { setInfo('how'); setMobileNav(false); }}>How it works</button><button onClick={() => { setInfo('collective'); setMobileNav(false); }}>The collective</button></nav>}</header>

    <main id="main" className="container">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><span className="hero-eyebrow"><span className="status-dot" /> A pond of possibilities</span><h1 id="hero-title">Small frogs.<br /><span>Big intelligence.</span></h1><p>Armed with AI. Powered by each other.<br />A collective of builders turning wild ideas into<br className="desktop-break" /> things that matter.</p><div className="hero-actions"><button className="button button-primary" onClick={openSubmit}>Submit your project<ArrowUpRight size={18} /></button><a className="hero-explore" href="#projects">Explore the pond<ArrowDown size={15} /></a></div><div className="hero-note"><span className="tiny-frogs"><FrogMark /><FrogMark /><FrogMark /></span><span>For the builders. By the builders.</span></div></div>
        <div className="hero-art"><img src="./images/pepe-squad.webp" width="1536" height="1024" alt="Three Pepe frogs working together with an AI chip, laptop, and a friendly robot companion." fetchPriority="high" /><div className="art-caption"><span className="crosshair">+</span><span>Human ideas. Amphibian energy.</span><Sparkles size={14} /></div></div>
      </section>

      <div className="principles"><div><span className="principle-icon"><ShieldCheck size={21} /></span><div><strong>Real people. Real projects.</strong><p>Twitter-verified builders, powered by Privy.</p></div></div><div><span className="principle-icon"><Globe2 size={21} /></span><div><strong>Open by default.</strong><p>Every submission is public. Discovery is free.</p></div></div><div><span className="principle-icon"><Users size={21} /></span><div><strong>Better, together.</strong><p>Find your people. Build the next thing.</p></div></div></div>

      <section id="projects" className="directory" aria-labelledby="directory-title">
        <div className="section-heading"><div><span className="eyebrow">The collective</span><h2 id="directory-title">Meet the builders<span className="text-green">.</span></h2><p>Fresh ideas. Real ambition. Take a look around the pond.</p></div><button className="button button-secondary directory-submit" onClick={openSubmit}>Submit a project<ArrowUpRight size={16} /></button></div>
        <div className="directory-toolbar"><div className="filter-tabs" role="group" aria-label="Filter projects by category">{categories.map(item => <button key={item} aria-pressed={category === item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}{item === 'All projects' && <span>{projects.length}</span>}</button>)}</div><div className="search-field"><Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor="project-search">Search projects</label><input id="project-search" type="search" placeholder="Search the pond…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button className="clear-search" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}</div></div>
        <div className="results-toolbar"><p role="status">{loading ? 'Loading the collective…' : `${filtered.length} ${filtered.length === 1 ? 'project' : 'projects'}`}{!hasBackend && <span className="preview-label"><span />Preview directory · Examples</span>}</p><div className="sort-control"><label htmlFor="sort">Sort by:</label><select id="sort" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="alphabetical">Name A–Z</option></select><ChevronDown size={14} aria-hidden="true" /></div></div>
        {loadError ? <div className="empty-state" role="alert"><Globe2 size={32} /><h3>The pond is out of reach.</h3><p>{loadError}</p><button className="button button-secondary" onClick={() => void reload()}>Try again<ArrowRight size={16} /></button></div> : loading ? <div className="loading-state" role="status">Finding the latest projects…</div> : filtered.length ? <div className="project-grid">{filtered.map((project, index) => <ProjectCard key={project.id} project={project} index={index} open={() => setSelected(project)} />)}</div> : <div className="empty-state"><Search size={32} /><h3>{query || category !== 'All projects' ? 'No frogs in this corner yet.' : 'Be the first in the pond.'}</h3><p>{query ? `No projects match “${query}”. Try another search or clear your filters.` : category !== 'All projects' ? 'No projects in this category yet. Explore the rest of the collective.' : 'Share your project and give the collective somewhere to start.'}</p><button className="button button-secondary" onClick={query || category !== 'All projects' ? () => { setQuery(''); setCategory('All projects'); } : openSubmit}>{query || category !== 'All projects' ? 'Clear filters' : 'Submit your project'}<ArrowRight size={16} /></button></div>}
        <div className="directory-end"><span />{hasBackend ? 'Good ideas are better when they’re shared.' : 'A glimpse of what we can build together.'}<span /></div>
      </section>

      <section className="join-banner"><span className="join-icon"><FrogMark /><Sparkles size={18} /></span><div><h2>There’s room for one more frog.</h2><p>Your idea belongs here. Let’s see what you’re building.</p></div><button className="button button-primary" onClick={openSubmit}>Join the collective<ArrowUpRight size={17} /></button></section>
    </main>
    <footer className="site-footer container"><div><a className="footer-brand" href="#"><FrogMark />pepe collective.</a><span>Small frogs. Big things.</span></div><nav aria-label="Footer navigation"><button onClick={() => setInfo('how')}>How it works</button><button onClick={() => setInfo('public')}>Public by design<ArrowUpRight size={13} /></button></nav><p>Made for the pond <Leaf size={14} /></p></footer>

    <div className="sr-only" role="status">{notice}</div>
    {notice && <div className="toast"><CheckCircle2 size={17} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {submitting && <Modal title={auth.authenticated && auth.twitterUsername ? 'Share your project' : 'Join the collective'} wide={Boolean(auth.authenticated && auth.twitterUsername)} onClose={() => setSubmitting(false)}><Submission onPublished={publish} onClose={() => { setSubmitting(false); document.getElementById('projects')?.scrollIntoView(); }} /></Modal>}
    {selected && <Modal title={selected.name || selected.projectUsername} onClose={() => setSelected(null)}><ProjectDetail project={selected} announce={setNotice} /></Modal>}
    {info && <Modal title={info === 'how' ? 'From an idea to the pond.' : info === 'public' ? 'Public by design.' : 'Welcome to the collective.'} onClose={() => setInfo(null)}><Information type={info} submit={openSubmit} /></Modal>}
  </>;
}
