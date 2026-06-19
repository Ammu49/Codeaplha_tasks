import { useCallback, useEffect, useState } from 'react';
import { LanguageSelect } from './LanguageSelect';
import {
  fetchHealth,
  fetchLanguages,
  translateText,
} from '../services/translateApi';
import type { HealthStatus, Language } from '../types';

export function TranslationTool() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [detectedLang, setDetectedLang] = useState('');
  const [provider, setProvider] = useState('');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch(() => setError('Could not load languages'));
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('Please enter some text to translate');
      return;
    }

    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const result = await translateText(sourceText, sourceLang, targetLang);
      setTranslatedText(result.translatedText);
      setDetectedLang(result.detectedLanguage || '');
      setProvider(result.provider);
    } catch (err) {
      setTranslatedText('');
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
    setDetectedLang('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleSpeak = useCallback(() => {
    if (!translatedText) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(translatedText);
    const langCode = targetLang.split('-')[0];
    utterance.lang = langCode;
    utterance.rate = 0.95;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [translatedText, targetLang]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleTranslate();
    }
  };

  const providerLabel =
    provider === 'azure'
      ? 'Microsoft Translator'
      : provider === 'google'
        ? 'Google Translate'
        : provider === 'libretranslate'
          ? 'LibreTranslate'
          : provider === 'mymemory'
            ? 'MyMemory'
            : '';

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          AI-Powered Translation
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Language Translation Tool
        </h1>
        <p className="mt-2 text-slate-500">
          Enter text, choose languages, and get instant translations
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="mb-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <LanguageSelect
            id="source-lang"
            label="Source language"
            value={sourceLang}
            languages={languages}
            onChange={setSourceLang}
          />

          <button
            type="button"
            onClick={handleSwap}
            disabled={sourceLang === 'auto'}
            title={sourceLang === 'auto' ? 'Select a source language to swap' : 'Swap languages'}
            className="mb-0.5 flex h-10 w-10 items-center justify-center self-end rounded-full border border-slate-200 text-slate-500 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 sm:mb-0"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </button>

          <LanguageSelect
            id="target-lang"
            label="Target language"
            value={targetLang}
            languages={languages}
            onChange={setTargetLang}
            excludeAuto
          />
        </div>

        <div className="mb-4">
          <label htmlFor="source-text" className="mb-1.5 block text-sm font-medium text-slate-600">
            Text to translate
          </label>
          <textarea
            id="source-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste text here..."
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <p className="mt-1 text-xs text-slate-400">
            Press Ctrl+Enter to translate · {sourceText.length} characters
          </p>
        </div>

        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading || !sourceText.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Translating...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Translate
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {translatedText && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
                Translation
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-700">
                {detectedLang && sourceLang === 'auto' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5">
                    Detected: {detectedLang}
                  </span>
                )}
                {providerLabel && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5">
                    via {providerLabel}
                  </span>
                )}
              </div>
            </div>

            <p className="text-lg leading-relaxed text-slate-800">{translatedText}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSpeak}
                disabled={speaking}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                {speaking ? 'Speaking...' : 'Listen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {health && (
        <p className="mt-4 text-center text-xs text-slate-400">
          API providers:{' '}
          {health.providers.azure && 'Microsoft Azure'}
          {health.providers.google && 'Google '}
          {health.providers.mymemory && ' '}
          {!health.providers.azure && !health.providers.google && ' — add API keys in server/.env for production use'}
        </p>
      )}
    </div>
  );
}
