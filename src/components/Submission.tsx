import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, CheckCircle2, CircleAlert, Globe2 } from 'lucide-react';
import { useAuth } from '../auth';
import { backendConfig, hasBackend } from '../config';
import { submitProject, validateProject, type Project, type ProjectInput } from '../lib/submissions';
import { XMark, FrogMark } from './Marks';

export function Submission({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [input, setInput] = useState<ProjectInput>({ projectUsername: '', contract: '', description: '', wallet: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState<Project | null>(null);

  async function verify() {
    setSigningIn(true);
    setStatus('');
    try { await auth.login(); } catch { setStatus('Unable to start Twitter verification. Try again.'); }
    finally { setSigningIn(false); }
  }
  async function submit(event: FormEvent) {
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
    if (!hasBackend) { setStatus('Submissions are not available in this preview. Your details have not been sent.'); return; }
    setSaving(true);
    try {
      const token = await auth.getAccessToken();
      if (!token || !auth.twitterUsername) throw new Error('Your session has expired. Verify with Twitter again.');
      const project = await submitProject(backendConfig, { ...input, projectUsername: input.projectUsername.trim().replace(/^@/, ''), contract: input.contract.trim(), wallet: input.wallet.trim(), description: input.description.trim() }, token);
      setPublished(project);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to submit. Try again.'); }
    finally { setSaving(false); }
  }

  if (published) return <div className="success-state" role="status">
    <span className="success-icon"><CheckCircle2 size={38} aria-hidden="true" /></span>
    <h3>Project submitted</h3>
    <p>@{published.projectUsername} is now public, verified by @{published.twitterUsername}.</p>
    <button type="button" className="button button-primary" onClick={onClose}>Done</button>
  </div>;

  if (!auth.authenticated || !auth.twitterUsername) return <div className="auth-gate">
    <div className="gate-art"><FrogMark /><span className="gate-plus" aria-hidden="true">+</span><XMark /></div>
    <h3>Verify your Twitter account</h3>
    <p>Verification links your project to a real Twitter account. Your handle and the project details you enter will be public.</p>
    <button type="button" className="button button-primary gate-button" disabled={!auth.ready || signingIn} onClick={verify}><XMark />{signingIn ? 'Opening Twitter…' : !auth.ready ? 'Checking verification…' : 'Verify with Twitter'}<ArrowRight size={17} aria-hidden="true" /></button>
    <div className="form-alert" role="alert">{(status || auth.error) && <><CircleAlert size={16} aria-hidden="true" /><span>{status || auth.error}</span></>}</div>
  </div>;

  const field = (name: keyof ProjectInput, label: string, placeholder: string, hint: string, multiline = false) => <div className={`form-field ${multiline ? 'full-width' : ''}`}>
    <label htmlFor={name}>{label}</label>
    {multiline
      ? <textarea id={name} name={name} required rows={4} maxLength={1000} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />
      : <input id={name} name={name} required type="text" maxLength={name === 'projectUsername' ? 33 : 42} autoComplete="off" spellCheck={false} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />}
    <span id={`${name}-hint`} className="field-hint">{hint}{multiline && <span className="character-count">{input.description.length}/1,000</span>}</span>
    {errors[name] && <span id={`${name}-error`} className="field-error"><CircleAlert size={14} aria-hidden="true" />{errors[name]}</span>}
  </div>;

  return <form className="project-form" onSubmit={submit} noValidate>
    <div className="public-callout"><Globe2 size={19} aria-hidden="true" /><p><strong>Every submission is public.</strong> Your Twitter account, project username, contract, description and wallet will be visible to everyone.</p></div>
    <fieldset disabled={saving}>
      <legend className="sr-only">Project details</legend>
      <div className="form-field full-width">
        <label htmlFor="twitter">Twitter account <span className="verified-label"><Check size={13} aria-hidden="true" /> Verified</span></label>
        <input id="twitter" name="twitter" value={`@${auth.twitterUsername}`} readOnly autoComplete="username" aria-describedby="twitter-hint" />
        <span id="twitter-hint" className="field-hint">From your verified Twitter account. <button type="button" className="link-button" onClick={() => { setStatus(''); void auth.logout(); }}>Not you? Sign out</button></span>
      </div>
      <div className="form-grid">
        {field('projectUsername', 'Project username', 'your_project', '3–32 letters, numbers, underscores or hyphens.')}
        {field('contract', 'Contract address', '0x…', 'Your project’s EVM contract address.')}
        {field('description', 'About your project', 'What are you building, and who is it for?', '20–1,000 characters.', true)}
        <div className="full-width">{field('wallet', 'Wallet address', '0x…', 'A public EVM wallet address. No wallet connection needed.')}</div>
      </div>
      <label className="consent"><input id="public-consent" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} aria-invalid={consentError} aria-describedby={consentError ? 'consent-error' : undefined} /><span>I understand that all five details will be publicly visible.</span></label>
      {consentError && <p className="field-error" id="consent-error"><CircleAlert size={14} aria-hidden="true" />Confirm that you want to make these details public.</p>}
    </fieldset>
    <div className="form-alert" role="alert">{status && <><CircleAlert size={16} aria-hidden="true" /><span>{status}</span></>}</div>
    <div className="form-footer"><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Submitting project…' : 'Submit project'}<ArrowRight size={17} aria-hidden="true" /></button></div>
  </form>;
}
