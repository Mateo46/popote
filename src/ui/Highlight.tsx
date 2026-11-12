/**
 * Met en évidence, dans un texte, les mots qui commencent par un des mots cherchés.
 * La comparaison ignore accents et casse (même règle que la recherche), mais le texte
 * affiché reste celui d'origine.
 */
import { normalizeName } from '../domain/normalize';
import styles from './Highlight.module.css';

export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  // Découpe en conservant les séparateurs : mots et ponctuation alternent.
  const parts = text.split(/([\p{L}\p{N}]+)/u);
  return (
    <>
      {parts.map((part, index) => {
        const word = normalizeName(part);
        const hit = word && tokens.some((token) => word.startsWith(token));
        return hit ? (
          <mark key={index} className={styles.mark}>
            {part}
          </mark>
        ) : (
          part
        );
      })}
    </>
  );
}
