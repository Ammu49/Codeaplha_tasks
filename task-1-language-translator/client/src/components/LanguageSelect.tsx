import type { Language } from '../types';

interface LanguageSelectProps {
  id: string;
  label: string;
  value: string;
  languages: Language[];
  onChange: (code: string) => void;
  excludeAuto?: boolean;
}

export function LanguageSelect({
  id,
  label,
  value,
  languages,
  onChange,
  excludeAuto = false,
}: LanguageSelectProps) {
  const options = excludeAuto
    ? languages.filter((l) => l.code !== 'auto')
    : languages;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
