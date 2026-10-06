import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Globe2 } from 'lucide-react';
import { backendConfig, usesPublicNetwork } from '../config';
import { submitProject, type Project, type ProjectInput } from '../services/directory';
import { validateProject } from '../lib/projects';

export function Submission({ onPublished, onClose, onBusyChange }: { onPublished: (project: Project) => void; onClose: () => void; onBusyChange?: (busy: boolean) => void }) {
  const [input, setInput] = useState<ProjectInput>({ twitterUsername: '', projectUsername: '', contract: '', description: '', wallet: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const successAction = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (published) successAction.current?.focus(); }, [published]);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setStatus('');
    const issues = validateProject(input);
    setErrors(issues);
    setConsentError(!consent);
    const first = Object.keys(issues)[0];
    if (first || !consent) {
      setStatus('Review the highlighted fields and confirm that you want to publish.');
      document.getElementById(first || 'public-consent')?.focus();
      return;
    }
    setSaving(true);
    onBusyChange?.(true);
    try {
      const project = await submitProject(backendConfig, { ...input, twitterUsername: input.twitterUsername.trim().replace(/^@/, ''), projectUsername: input.projectUsername.trim().replace(/^@/, ''), contract: input.contract.trim(), wallet: input.wallet.trim(), description: input.description.trim() });
      onPublished(project);
      setPublished(true);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to publish. Please try again.'); }
    finally { setSaving(false); onBusyChange?.(false); }
  }

  if (published) return <div className="success-state"><span className="success-icon"><CheckCircle2 size={38} /></span><h3>You’re in the pond.</h3><p>Your project is published. Anyone can now see your project details in the collective.</p><button ref={successAction} className="button button-primary" onClick={onClose}>Explore the collective <ArrowRight size={17} /></button></div>;

  const field = (name: keyof ProjectInput, label: string, placeholder: string, hint: string, multiline = false) => <div className={`form-field ${multiline ? 'full-width' : ''}`}>
    <label htmlFor={name}>{label}{name === 'twitterUsername' ? <span> (optional)</span> : <span aria-hidden="true"> *</span>}</label>
    {multiline
      ? <textarea id={name} name={name} required rows={4} maxLength={1000} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />
      : <input id={name} name={name} required={name !== 'twitterUsername'} type="text" maxLength={name === 'projectUsername' || name === 'twitterUsername' ? 16 : 256} autoComplete={name === 'twitterUsername' ? 'username' : 'off'} autoCapitalize="none" spellCheck={false} value={input[name]} placeholder={placeholder} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint ${errors[name] ? `${name}-error` : ''}`} onChange={event => setInput({ ...input, [name]: event.target.value })} />}
    <span id={`${name}-hint`} className="field-hint">{hint}{multiline && <span className="character-count">{input.description.length}/1,000</span>}</span>
    {errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}
  </div>;

  return <form className="project-form" onSubmit={publish} noValidate>
    <p className="form-intro">Tell the collective what you’re building. All fields are required except your personal Twitter account.</p>
    <div className="public-callout"><Globe2 size={19} /><p><strong>Your submission will be public.</strong> Your project Twitter, contract, description, wallet, and personal Twitter (if provided) will be visible to everyone.</p></div>
    {usesPublicNetwork && <p className="publishing-notice">Shared on a public network, beyond this website. Only publish details you want others to keep. Editing and removal are not available here.</p>}
    <fieldset disabled={saving}>
      <legend className="sr-only">Project details</legend>
      {field('twitterUsername', 'Personal Twitter account', '@your_handle', 'You can leave this blank. Account ownership is not verified.')}
      <div className="form-grid">{field('projectUsername', 'Project Twitter account', '@your_project', 'Your project’s Twitter username. 1–15 letters, numbers, or underscores.')}{field('contract', 'Contract address', '0x…', 'Your project’s EVM contract address.')}{field('description', 'About your project', 'What are you building, and who is it for?', '20–1,000 characters. Make it your own.', true)}<div className="full-width">{field('wallet', 'Wallet address', '0x…', 'A public EVM wallet address. No wallet connection needed. Hackathon winner funds will be sent to this address.')}</div></div>
      <label className="consent"><input id="public-consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} aria-invalid={consentError} aria-describedby={consentError ? 'consent-error' : undefined} /><span>I understand that the details I submit will be publicly visible.</span></label>
      {consentError && <p className="field-error" id="consent-error">Confirm that you want to make these details public.</p>}
    </fieldset>
    <div className="form-alert" role="alert">{status}</div>
    <p className="publishing-progress" role="status">{saving ? 'Saving and checking your public submission. Keep this form open until confirmation.' : ''}</p>
    <div className="form-footer"><span><Globe2 size={14} /> Public submission</span><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Publishing project…' : 'Publish project'}<ArrowRight size={17} /></button></div>
  </form>;
}
