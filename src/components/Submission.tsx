import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Globe2 } from 'lucide-react';
import { backendConfig, hasBackend } from '../config';
import { submitProject, type Project, type ProjectInput } from '../lib/submissions';
import { validateProject } from '../lib/projects';

export function Submission({ onPublished, onClose }: { onPublished: (project: Project) => void; onClose: () => void }) {
  const [input, setInput] = useState<ProjectInput>({ twitterUsername: '', projectUsername: '', contract: '', description: '', wallet: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

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
    if (!hasBackend) { setStatus('Publishing is not available yet. Please check back later. Your details have not been submitted.'); return; }
    setSaving(true);
    try {
      const project = await submitProject(backendConfig, { ...input, twitterUsername: input.twitterUsername.trim().replace(/^@/, ''), projectUsername: input.projectUsername.trim().replace(/^@/, ''), contract: input.contract.trim(), wallet: input.wallet.trim(), description: input.description.trim() });
      onPublished(project);
      setPublished(true);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to publish. Please try again.'); }
    finally { setSaving(false); }
  }

  if (published) return <div className="success-state"><span className="success-icon"><CheckCircle2 size={38} /></span><h3>You’re in the pond.</h3><p>Your project is published. Anyone can now see your project details in the collective.</p><button className="button button-primary" onClick={onClose}>Explore the collective <ArrowRight size={17} /></button></div>;

  const field = (name: keyof ProjectInput, label: string, placeholder: string, hint: string, multiline = false) => <div className={`form-field ${multiline ? 'full-width' : ''}`}>
    <label htmlFor={name}>{label}<span aria-hidden="true"> *</span></label>
    {multiline
      ? <textarea id={name} name={name} required rows={4} maxLength={1000} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />
      : <input id={name} name={name} required type="text" maxLength={name === 'projectUsername' ? 33 : name === 'twitterUsername' ? 16 : 42} autoComplete={name === 'twitterUsername' ? 'username' : 'off'} autoCapitalize="none" spellCheck={false} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />}
    <span id={`${name}-hint`} className="field-hint">{hint}{multiline && <span className="character-count">{input.description.length}/1,000</span>}</span>
    {errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}
  </div>;

  return <form className="project-form" onSubmit={publish} noValidate>
    <p className="form-intro">Five details. One new possibility. Tell the collective what you’re building.</p>
    <div className="public-callout"><Globe2 size={19} /><p><strong>Your submission will be public.</strong> Your Twitter, project username, contract, description, and wallet will be visible to everyone.</p></div>
    {!hasBackend && <p className="publishing-notice">Publishing is not available yet. You can fill out the form, but your details will not be saved.</p>}
    <fieldset disabled={saving}>
      <legend className="sr-only">Project details</legend>
      {field('twitterUsername', 'Twitter account', '@your_handle', 'Your Twitter username. Account ownership is not verified.')}
      <div className="form-grid">{field('projectUsername', 'Project username', 'your_project', '3–32 letters, numbers, underscores, or hyphens.')}{field('contract', 'Contract address', '0x…', 'Your project’s EVM contract address.')}{field('description', 'About your project', 'What are you building, and who is it for?', '20–1,000 characters. Make it your own.', true)}<div className="full-width">{field('wallet', 'Wallet address', '0x…', 'A public EVM wallet address. No wallet connection needed.')}</div></div>
      <label className="consent"><input id="public-consent" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} aria-invalid={consentError} aria-describedby={consentError ? 'consent-error' : undefined} /><span>I understand that all five details will be publicly visible.</span></label>
      {consentError && <p className="field-error" id="consent-error">Confirm that you want to make these details public.</p>}
    </fieldset>
    <div className="form-alert" role="alert">{status}</div>
    <div className="form-footer"><span><Globe2 size={14} /> Public submission</span><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Publishing project…' : 'Publish project'}<ArrowRight size={17} /></button></div>
  </form>;
}
