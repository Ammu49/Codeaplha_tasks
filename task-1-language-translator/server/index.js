import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'sv', name: 'Swedish' },
];

async function translateWithAzure(text, source, target) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION || 'eastus';

  if (!key || key === 'your_azure_key_here') {
    return null;
  }

  const params = new URLSearchParams({
    'api-version': '3.0',
    to: target,
  });
  if (source !== 'auto') {
    params.set('from', source);
  }

  const response = await fetch(
    `https://api.cognitive.microsofttranslator.com/translate?${params}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Azure Translator error: ${err}`);
  }

  const data = await response.json();
  const detectedLanguage = data[0]?.detectedLanguage?.language;
  return {
    translatedText: data[0].translations[0].text,
    detectedLanguage,
    provider: 'azure',
  };
}

async function translateWithGoogle(text, source, target) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    key,
    q: text,
    target,
    format: 'text',
  });
  if (source !== 'auto') {
    params.set('source', source);
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?${params}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Translate error: ${err}`);
  }

  const data = await response.json();
  return {
    translatedText: data.data.translations[0].translatedText,
    detectedLanguage: data.data.translations[0].detectedSourceLanguage,
    provider: 'google',
  };
}

async function translateWithLibre(text, source, target) {
  const key = process.env.LIBRETRANSLATE_API_KEY;
  if (!key) return null;

  const sourceCode = source === 'auto' ? 'auto' : source.split('-')[0];
  const targetCode = target.split('-')[0];

  const response = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceCode,
      target: targetCode,
      format: 'text',
      api_key: key,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LibreTranslate error: ${err}`);
  }

  const data = await response.json();
  return {
    translatedText: data.translatedText,
    detectedLanguage: data.detectedLanguage?.language,
    provider: 'libretranslate',
  };
}

async function translateWithMyMemory(text, source, target) {
  const sourceCode = source === 'auto' ? 'en' : source.split('-')[0];
  const targetCode = target.split('-')[0];
  const langpair = `${sourceCode}|${targetCode}`;

  const params = new URLSearchParams({ q: text, langpair });
  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params}`
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`MyMemory error: ${err}`);
  }

  const data = await response.json();
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'MyMemory translation failed');
  }

  return {
    translatedText: data.responseData.translatedText,
    detectedLanguage: source === 'auto' ? undefined : sourceCode,
    provider: 'mymemory',
  };
}

app.get('/api/health', (_req, res) => {
  const hasAzure =
    process.env.AZURE_TRANSLATOR_KEY &&
    process.env.AZURE_TRANSLATOR_KEY !== 'your_azure_key_here';
  const hasGoogle = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  const hasLibre = !!process.env.LIBRETRANSLATE_API_KEY;

  res.json({
    status: 'ok',
    providers: {
      azure: hasAzure,
      google: hasGoogle,
      libretranslate: hasLibre,
      mymemory: true,
    },
  });
});

app.get('/api/languages', (_req, res) => {
  res.json([
    { code: 'auto', name: 'Detect language' },
    ...LANGUAGES,
  ]);
});

app.post('/api/translate', async (req, res) => {
  const { text, source = 'auto', target = 'es' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!target) {
    return res.status(400).json({ error: 'Target language is required' });
  }

  if (source !== 'auto' && source === target) {
    return res.status(400).json({ error: 'Source and target languages must differ' });
  }

  try {
    let result =
      (await translateWithAzure(text, source, target)) ||
      (await translateWithGoogle(text, source, target)) ||
      (await translateWithLibre(text, source, target)) ||
      (await translateWithMyMemory(text, source, target));

    res.json(result);
  } catch (err) {
    console.error('Translation error:', err.message);
    res.status(500).json({ error: err.message || 'Translation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Translation API server running on http://localhost:${PORT}`);
});
