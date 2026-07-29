import QRCode from "qrcode";
import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

const DEFAULT_VALUE = "https://www.khai-hub.com";

function normalizeWebUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a link first.");

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Use an http:// or https:// link.");
  return parsed.toString();
}

function downloadBlob(contents: BlobPart, type: string, filename: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const inputId = useId();
  const [draft, setDraft] = useState(DEFAULT_VALUE);
  const [encodedUrl, setEncodedUrl] = useState(DEFAULT_VALUE);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayUrl = useMemo(() => {
    try {
      const parsed = new URL(encodedUrl);
      return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
    } catch {
      return encodedUrl;
    }
  }, [encodedUrl]);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(encodedUrl, {
      errorCorrectionLevel: "M",
      width: 1024,
      margin: 2,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).then((value) => {
      if (active) setQrDataUrl(value);
    });
    return () => { active = false; };
  }, [encodedUrl]);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopied(false);
    setBusy(true);
    try {
      const normalized = normalizeWebUrl(draft);
      setDraft(normalized);
      setEncodedUrl(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This link cannot be used.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    if (!qrDataUrl) return;
    const response = await fetch(qrDataUrl);
    downloadBlob(await response.blob(), "image/png", "qrhub-code.png");
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(encodedUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    });
    downloadBlob(svg, "image/svg+xml", "qrhub-code.svg");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(encodedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function clear() {
    setDraft("");
    setError("");
    setCopied(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="QRHub home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <strong>QRHub</strong>
        </a>
        <span className="privacy-pill"><b aria-hidden="true" /> Runs locally in your browser</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">LINK → QR CODE</p>
          <h1>Make any link<br />easy to scan.</h1>
          <p className="hero-description">Paste a web address, generate a crisp QR code, and download it as PNG or SVG. Your link stays on your device.</p>

          <form className="generator-form" onSubmit={generate} noValidate>
            <label htmlFor={inputId}>Web link</label>
            <div className={error ? "input-row has-error" : "input-row"}>
              <span aria-hidden="true">↗</span>
              <input
                id={inputId}
                inputMode="url"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="https://example.com"
                spellCheck={false}
                type="url"
                value={draft}
              />
              {draft ? <button className="clear-button" onClick={clear} type="button" aria-label="Clear link">×</button> : null}
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : <p className="form-hint">Links without https:// are completed automatically.</p>}
            <button className="generate-button" disabled={busy} type="submit">
              <span>{busy ? "Generating…" : "Generate QR Code"}</span>
              <b aria-hidden="true">→</b>
            </button>
          </form>
        </div>

        <section className="result-card" aria-label="Generated QR code">
          <div className="result-header">
            <div>
              <p>READY TO SCAN</p>
              <h2>{displayUrl}</h2>
            </div>
            <span className="live-dot">LIVE</span>
          </div>

          <div className="qr-stage">
            <div className="corner corner-one" />
            <div className="corner corner-two" />
            <div className="corner corner-three" />
            <div className="corner corner-four" />
            {qrDataUrl ? <img alt={`QR code for ${encodedUrl}`} height="1024" src={qrDataUrl} width="1024" /> : <div className="qr-loading">Generating…</div>}
          </div>

          <div className="result-actions">
            <button onClick={() => void downloadPng()} type="button"><span>Download PNG</span><b>↓</b></button>
            <button onClick={() => void downloadSvg()} type="button"><span>Download SVG</span><b>↓</b></button>
          </div>
          <button className="copy-action" onClick={() => void copyLink()} type="button">
            <span>{copied ? "Link copied" : "Copy original link"}</span>
            <b aria-hidden="true">{copied ? "✓" : "⧉"}</b>
          </button>
        </section>
      </section>

      <footer>
        <p>Free utility by <a href="https://www.khai-hub.com">Khai-Hub</a></p>
        <p>No uploads. No tracking. No account required.</p>
      </footer>
    </main>
  );
}
