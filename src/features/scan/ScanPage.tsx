/**
 * Scan d'un feuillet papier : photo du recto (titre, ingrédients) et du verso (étapes),
 * lecture sur l'appareil, puis relecture dans le formulaire de recette.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { parseOcr } from '../../domain/parseOcr';
import { strings } from '../../strings';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { OcrStartError, recognize, type OcrProgress } from './ocr';
import styles from './ScanPage.module.css';

type Side = 'front' | 'back';

/** Données transmises à l'écran de relecture (état de navigation). */
export interface ScanResult {
  parsed: ReturnType<typeof parseOcr>;
  rawText: string;
  files: File[];
}

export function ScanPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<Record<Side, File | null>>({ front: null, back: null });
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Annule une lecture en cours si l'on quitte l'écran.
  useEffect(() => () => abort.current?.abort(), []);

  const chosen = [files.front, files.back].filter((file): file is File => file !== null);

  async function read() {
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await recognize(chosen, setProgress, controller.signal);
      const rawText = result.pages.join('\n\n— — —\n\n');
      if (!rawText.trim()) {
        setError(strings.scan.nothing);
        return;
      }
      const scanned: ScanResult = {
        parsed: parseOcr(result.pages, result.lowConfidence),
        rawText,
        files: chosen,
      };
      navigate('/recettes/nouvelle', { replace: true, state: { scanned } });
    } catch (reason) {
      if (!controller.signal.aborted) {
        console.error('Lecture du feuillet', reason);
        setError(reason instanceof OcrStartError ? strings.scan.startFailed : strings.scan.failed);
      }
    } finally {
      setProgress(null);
      abort.current = null;
    }
  }

  const busy = progress !== null;

  return (
    <Screen
      title={strings.scan.title}
      back={{ label: strings.scan.back, onClick: () => navigate(-1) }}
    >
      <p className={styles.intro}>{strings.scan.intro}</p>

      <div className={styles.sides}>
        <SidePicker
          label={strings.scan.front}
          hint={strings.scan.frontHint}
          file={files.front}
          disabled={busy}
          onChange={(file) => setFiles((current) => ({ ...current, front: file }))}
        />
        <SidePicker
          label={strings.scan.backSide}
          hint={strings.scan.backHint}
          file={files.back}
          disabled={busy}
          onChange={(file) => setFiles((current) => ({ ...current, back: file }))}
        />
      </div>

      <div className={styles.actions}>
        {busy ? (
          <>
            <div
              className={styles.progress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress.value * 100)}
            >
              <i style={{ width: `${Math.max(4, progress.value * 100)}%` }} />
            </div>
            <p className={styles.status} role="status">
              {progress.stage === 'loading'
                ? strings.scan.loading
                : strings.scan.reading(Math.round(progress.value * 100))}
            </p>
            <Button variant="secondary" onClick={() => abort.current?.abort()}>
              {strings.scan.cancel}
            </Button>
          </>
        ) : (
          <Button block disabled={!files.front && !files.back} onClick={() => void read()}>
            {strings.scan.read}
          </Button>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </Screen>
  );
}

interface SidePickerProps {
  label: string;
  hint: string;
  file: File | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

/** Case photo d'une face du feuillet, avec aperçu. */
function SidePicker({ label, hint, file, disabled, onChange }: SidePickerProps) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  function handle(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (chosen) onChange(chosen);
  }

  return (
    <div className={styles.side}>
      <label className={styles.slot} aria-disabled={disabled}>
        {/* Sans `capture`, iOS propose l'appareil photo et la photothèque. */}
        <input
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={handle}
          disabled={disabled}
          aria-label={`${label} : ${file ? strings.scan.replace : strings.scan.take}`}
        />
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <span className={styles.empty}>
            <Icon name="camera" size={28} />
            {strings.scan.take}
          </span>
        )}
      </label>
      <div className={styles.caption}>
        <span>
          <b>{label}</b>
          <small>{hint}</small>
        </span>
        {file && !disabled && (
          <button
            type="button"
            className={styles.remove}
            aria-label={strings.scan.remove(label)}
            onClick={() => onChange(null)}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
