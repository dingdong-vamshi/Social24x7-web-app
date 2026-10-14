import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { passwordRequirements } from '../auth/passwordPolicy'

export function PasswordInput({ label, showRequirements = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; showRequirements?: boolean }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return <div className="password-field">
    <label htmlFor={id}>{label}</label>
    <div className="password-control">
      <input {...props} id={id} type={visible ? 'text' : 'password'} aria-describedby={showRequirements ? `${id}-rules` : props['aria-describedby']} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(value => !value)} disabled={props.disabled}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
    </div>
    {showRequirements && <ul id={`${id}-rules`} className="password-requirements">{passwordRequirements.map(rule => <li key={rule.label} data-met={rule.test(String(props.value ?? ''))}>{rule.test(String(props.value ?? '')) ? '✓' : '○'} {rule.label}</li>)}</ul>}
  </div>
}
