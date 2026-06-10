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

    const getNestedValue = (obj: any, pathParts: string[]): any => {
      if (pathParts.length === 0) return obj
      const [first, ...rest] = pathParts
      if (first === "__proto__" || first === "constructor" || first === "prototype") {
        return undefined
      }
      if (
        obj &&
        typeof obj === "object" &&
        Object.prototype.hasOwnProperty.call(obj, first)
      ) {
        return getNestedValue(obj[first], rest)
      }
      return undefined
    }

    const current = getNestedValue(dict, parts)
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
