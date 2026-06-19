export interface Language {
  code: string;
  name: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  provider: 'azure' ;
}

export interface HealthStatus {
  status: string;
  providers: {
    azure: boolean;
    google: boolean;
    libretranslate: boolean;
    mymemory: boolean;
  };
}
