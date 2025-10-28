import en from './langs/en'
import ar from './langs/ar'
import tr from './langs/tr'
import fr from './langs/fr'
import es from './langs/es'
import de from './langs/de'
import ru from './langs/ru'
import zh from './langs/zh'
import hi from './langs/hi'
import pt from './langs/pt'
import ja from './langs/ja'
import id from './langs/id'
import it from './langs/it'

export const LANGS = {
  en, ar, tr, fr, es, de, ru, zh, hi, pt, ja, id, it
}

export const RTL_LANGS = ['ar', 'fa', 'ur', 'he']

export function t(current, key) {
  const pack = LANGS[current] || LANGS.en
  return pack[key] ?? key
}

export function applyDir(lang) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang
}
