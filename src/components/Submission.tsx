import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, Globe2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { backendConfig, hasBackend } from '../config';
import { submitProject, type Project, type ProjectInput } from '../lib/submissions';
import { validateProject } from '../lib/projects';
import { XMark, FrogMark } from './Marks';

export function Submission({ onPublished, onClose }: { onPublished: (project: Project) => void; onClose: () => void }) {
  const auth = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [input, setInput] = useState<ProjectInput>({ projectUsername: '', contract: '', description: '', wallet: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

  async function signIn() {
    setSigningIn(true);
    setStatus('');
    try { await auth.login(); } catch { setStatus('Twitter sign-in could not start. Please try again.'); }
    finally { setSigningIn(false); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setStatus('');
    const issues = validateProject(input);
    setErrors(issues);
    setConsentError(!consent);
    const first = Object.keys(issues)[0];
    if (first || !consent) {
      requestAnimationFrame(() => document.getElementById(first || 'public-consent')?.focus());
      return;
    }
    if (!hasBackend) { setStatus('Publishing is not available in this preview. Your details have not been submitted.'); return; }
    setSaving(true);
    try {
      const token = await auth.getAccessToken();
      if (!token || !auth.twitterUsername) throw new Error('Your session has expired. Sign out and sign in with Twitter again.');
      const project = await submitProject(backendConfig, { ...input, projectUsername: input.projectUsername.trim().replace(/^@/, ''), contract: input.contract.trim(), wallet: input.wallet.trim(), description: input.description.trim() }, token);
      onPublished(project);
      setPublished(true);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to publish. Please try again.'); }
    finally { setSaving(false); }
  }

  if (published) return <div className="success-state"><span className="success-icon"><CheckCircle2 size={38} /></span><h3>You’re in the pond.</h3><p>Your project is published. Anyone can now see your project details in the collective.</p><button className="button button-primary" onClick={onClose}>Explore the collective <ArrowRight size={17} /></button></div>;

  if (!auth.authenticated || !auth.twitterUsername) return <div className="auth-gate">
    <div className="gate-art"><FrogMark /><span className="gate-plus">+</span><XMark /></div>
    <span className="eyebrow">Good things start with a hello</span>
    <h3>A real account.<br />A place in the collective.</h3>
    <p>Verify your Twitter account to share your project. It keeps the pond connected to real people.</p>
    <div className="gate-steps"><span><span className="step-number current">1</span>Verify Twitter</span><span className="step-line" /><span><span className="step-number">2</span>Add 5 details</span><span className="step-line" /><span><span className="step-number">3</span>Go public</span></div>
    <button className="button button-primary gate-button" disabled={!auth.ready || signingIn} onClick={signIn}><XMark />{signingIn ? 'Connecting to Twitter…' : !auth.ready ? 'Checking your session…' : 'Continue with Twitter'}<ArrowRight size={17} /></button>
    <div className="form-alert" role="alert">{status || auth.error}</div>
    <p className="secure-note"><ShieldCheck size={14} /> Authentication powered by Privy</p>
    <div className="gate-public"><Globe2 size={19} /><p><strong>Built in the open.</strong> All five details you submit will be public. Signing in alone won’t publish anything.</p></div>
  </div>;

  const field = (name: keyof ProjectInput, label: string, placeholder: string, hint: string, multiline = false) => <div className={`form-field ${multiline ? 'full-width' : ''}`}>
    <label htmlFor={name}>{label}<span aria-hidden="true"> *</span></label>
    {multiline
      ? <textarea id={name} name={name} required rows={4} maxLength={1000} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />
      : <input id={name} name={name} required type="text" maxLength={name === 'projectUsername' ? 33 : 42} autoComplete="off" spellCheck={false} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />}
    <span id={`${name}-hint`} className="field-hint">{hint}{multiline && <span className="character-count">{input.description.length}/1,000</span>}</span>
    {errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}
  </div>;

  return <form className="project-form" onSubmit={publish} noValidate>
    <p className="form-intro">Five details. One new possibility. Tell the collective what you’re building.</p>
    <div className="public-callout"><Globe2 size={19} /><p><strong>Your submission will be public.</strong> Your Twitter, project username, contract, description, and wallet will be visible to everyone.</p></div>
    <fieldset disabled={saving}>
      <legend className="sr-only">Project details</legend>
      <div className="form-field full-width"><label htmlFor="twitter">Twitter account <span className="verified-label"><Check size={13} /> Verified</span></label><input id="twitter" name="twitter" value={`@${auth.twitterUsername}`} readOnly autoComplete="username" aria-describedby="twitter-hint" /><span id="twitter-hint" className="field-hint">Linked to your authenticated Twitter account.</span></div>
      <div className="form-grid">{field('projectUsername', 'Project username', 'your_project', '3–32 letters, numbers, underscores, or hyphens.')}{field('contract', 'Contract address', '0x…', 'Your project’s EVM contract address.')}{field('description', 'About your project', 'What are you building, and who is it for?', '20–1,000 characters. Make it your own.', true)}<div className="full-width">{field('wallet', 'Wallet address', '0x…', 'A public EVM wallet address. No wallet connection needed.')}</div></div>
      <label className="consent"><input id="public-consent" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} aria-invalid={consentError} aria-describedby={consentError ? 'consent-error' : undefined} /><span>I understand that all five details will be publicly visible.</span></label>
      {consentError && <p className="field-error" id="consent-error">Confirm that you want to make these details public.</p>}
    </fieldset>
    <div className="form-alert" role="alert">{status}</div>
    <div className="form-footer"><span><LockKeyhole size={14} /> Verified with Privy</span><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Publishing project…' : 'Publish project'}<ArrowRight size={17} /></button></div>
  </form>;
}
