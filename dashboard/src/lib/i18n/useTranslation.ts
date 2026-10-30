'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { en } from './locales/en';
import { bn } from './locales/bn';
import { Language, TranslationDictionary } from './types';

const dictionaries: Record<Language, TranslationDictionary> = {
  en,
  bn,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function useTranslation() {
  const language = useAppStore((state) => state.language) || 'bn';
  const setStoreLanguage = useAppStore((state) => state.setLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setStoreLanguage(lang);
  }, [setStoreLanguage]);

  const t = useCallback(
    (key: TranslationKey | string, params?: Record<string, string | number>): string => {
      const currentDict = dictionaries[language] || dictionaries.bn;
      let text = getNestedValue(currentDict, key);

      // Fallback to English if key missing in current language
      if (text === undefined && language !== 'en') {
        text = getNestedValue(dictionaries.en, key);
      }

      // Final fallback to the key itself
      if (text === undefined) {
        text = key;
      }

      // Replace variable parameters: e.g. {count}
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text!.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    isBangla: language === 'bn',
    isEnglish: language === 'en',
  };
}
