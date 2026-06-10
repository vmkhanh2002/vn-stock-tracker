"use client"
import React, { createContext, useContext, useState, useEffect } from "react"
import { viDict, enDict, Language } from "@/lib/translations"

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, variables?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi")

  useEffect(() => {
    // 1. Check cookies first (so it matches backend pre-renders)
    const match = document.cookie.match(/(^| )lang=([^;]+)/)
    if (match && (match[2] === "vi" || match[2] === "en")) {
      setLanguageState(match[2] as Language)
    } else {
      // 2. Check localStorage
      const saved = localStorage.getItem("lang") as Language
      if (saved === "vi" || saved === "en") {
        setLanguageState(saved)
      }
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("lang", lang)
    document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
  }

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const dict = language === "vi" ? viDict : enDict
    const parts = key.split(".")
    let current: any = dict
    for (const part of parts) {
      if (
        current &&
        typeof current === "object" &&
        Object.prototype.hasOwnProperty.call(current, part)
      ) {
        current = current[part]
      } else {
        return key
      }
    }
    if (typeof current !== "string") {
      return key
    }

    // Inject dynamic variables if provided
    let text = current
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replaceAll(`{${k}}`, String(v))
      })
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
