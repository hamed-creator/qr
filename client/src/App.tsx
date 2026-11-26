import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Download,
  ImagePlus,
  Link2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { colord } from 'colord';
import QRCodeStyling from 'qr-code-styling';

type DotStyle = 'square' | 'rounded' | 'dots' | 'classy-rounded';
type CornerStyle = 'square' | 'extra-rounded' | 'dot';
type LogoSize = 'small' | 'medium' | 'large';
type ExportSize = 1024 | 2048 | 4096;

const PREVIEW_DATA = 'https://preview.example.com';
const logoSizes: Record<LogoSize, number> = {
  small: 0.25,
  medium: 0.35,
  large: 0.4,
};
const palettes = [
  { name: 'Ink', foreground: '#17211d', background: '#ffffff' },
  { name: 'Cobalt', foreground: '#1838a5', background: '#ffffff' },
  { name: 'Pine', foreground: '#15533d', background: '#ffffff' },
  { name: 'Terracotta', foreground: '#713d2d', background: '#fffaf3' },
];
const dotStyles: { label: string; value: DotStyle; sample: string }[] = [
  { label: 'Classic', value: 'square', sample: 'pattern-square' },
  { label: 'Rounded', value: 'rounded', sample: 'pattern-rounded' },
  { label: 'Dots', value: 'dots', sample: 'pattern-dots' },
  { label: 'Fluid', value: 'classy-rounded', sample: 'pattern-fluid' },
];
const cornerStyles: { label: string; value: CornerStyle; sample: string }[] = [
  { label: 'Sharp', value: 'square', sample: 'corner-sharp' },
  { label: 'Soft', value: 'extra-rounded', sample: 'corner-soft' },
  { label: 'Circle', value: 'dot', sample: 'corner-circle' },
];

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const { r, g, b } = colord(color).toRgb();
    const linear = [r, g, b].map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function normalizeLogo(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This image could not be opened. Try a PNG or JPG.'));
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longestSide) throw new Error('This image has no readable dimensions.');

    const scale = Math.min(1, 1024 / longestSide);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this image.');

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function App() {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [dotStyle, setDotStyle] = useState<DotStyle>('square');
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>('square');
  const [fgColor, setFgColor] = useState('#17211d');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isTransparentBg, setIsTransparentBg] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [logoSize, setLogoSize] = useState<LogoSize>('medium');
  const [exportSize, setExportSize] = useState<ExportSize>(2048);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const contrast = contrastRatio(fgColor, isTransparentBg ? '#ffffff' : bgColor);
  const hasLowContrast = contrast < 3.5;

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.replaceChildren();

    const qr = new QRCodeStyling({
      width: 320,
      height: 320,
      type: 'canvas',
      data: urlInput.trim() || PREVIEW_DATA,
      margin: 20,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: fgColor, type: dotStyle },
      cornersSquareOptions: { color: fgColor, type: cornerStyle },
      cornersDotOptions: {
        color: fgColor,
        type: cornerStyle === 'dot' ? 'dot' : 'square',
      },
      backgroundOptions: { color: isTransparentBg ? 'transparent' : bgColor },
      image: logoDataUrl || undefined,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: logoSizes[logoSize],
        margin: 8,
      },
    });
    qr.append(previewRef.current);
  }, [urlInput, dotStyle, cornerStyle, fgColor, bgColor, isTransparentBg, logoDataUrl, logoSize]);

  async function acceptLogo(file?: File) {
    if (!file) return;
    setError('');
    setNotice('');
    if (file.size > 5 * 1024 * 1024) {
      setError('That image is over 5 MB. Choose a smaller file.');
      return;
    }

    const supported = /image\/(png|jpeg|svg\+xml|webp)/i.test(file.type)
      || /\.(png|jpe?g|svg|webp)$/i.test(file.name);
    if (!supported) {
      setError('Choose a PNG, JPG, SVG, or WebP image.');
      return;
    }

    try {
      setLogoDataUrl(await normalizeLogo(file));
      setLogoName(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The logo could not be prepared.');
    }
  }

  async function downloadQr() {
    setError('');
    setNotice('');
    setIsDownloading(true);
    try {
      const response = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      const result = await response.json();
      if (!response.ok || !result.valid) {
        setError(result.error || 'That link could not be validated. Check it and try again.');
        return;
      }

      const download = new QRCodeStyling({
        width: exportSize,
        height: exportSize,
        type: 'canvas',
        data: result.normalizedUrl,
        margin: 20,
        qrOptions: { errorCorrectionLevel: 'H' },
        dotsOptions: { color: fgColor, type: dotStyle },
        cornersSquareOptions: { color: fgColor, type: cornerStyle },
        cornersDotOptions: {
          color: fgColor,
          type: cornerStyle === 'dot' ? 'dot' : 'square',
        },
        backgroundOptions: { color: isTransparentBg ? 'transparent' : bgColor },
        image: logoDataUrl || undefined,
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: logoSizes[logoSize],
          margin: 8,
        },
      });
      await download.download({ name: result.suggestedFilename, extension: 'png' });
      setNotice(`Your ${exportSize}px print-ready QR code is downloading.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The QR code could not be created.');
    } finally {
      setIsDownloading(false);
    }
  }

  function applyPalette(palette: typeof palettes[number]) {
    setFgColor(palette.foreground);
    setBgColor(palette.background);
    setIsTransparentBg(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="QR Studio home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>qr<span className="brand-light">studio</span></span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> PRINT-READY, MADE SIMPLE</span>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> YOUR LINK, YOUR LOOK</p>
          <h1>Make it <span>scannable.</span></h1>
          <p className="intro">A polished QR code, ready for the real world. Make it yours, then take it to print.</p>
        </div>
        <div className="heading-stamp"><span>QR</span><small>STUDIO<br />NO. 001</small></div>
      </section>

      <div className="workspace">
        <section className="controls-column" aria-label="QR code settings">
          <section className="panel destination-panel">
            <div className="section-heading">
              <span className="step-number">01</span>
              <div><h2>Where should it go?</h2><p>Add the destination for your QR code.</p></div>
              <Link2 className="section-icon" size={19} />
            </div>
            <label className="field-label" htmlFor="destination">DESTINATION LINK</label>
            <div className="url-field">
              <input
                id="destination"
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                  setError('');
                  setNotice('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void downloadQr();
                }}
                placeholder="yourwebsite.com"
                autoComplete="url"
                inputMode="url"
              />
              <span className="https-badge">HTTPS</span>
            </div>
            <p className="field-hint">No need to type https:// — we’ll add it for you.</p>
          </section>

          <section className="panel">
            <div className="section-heading">
              <span className="step-number">02</span>
              <div><h2>Find your shape</h2><p>A little character goes a long way.</p></div>
            </div>
            <span className="field-label">PATTERN</span>
            <div className="choice-grid pattern-grid">
              {dotStyles.map((style) => (
                <button
                  type="button"
                  key={style.value}
                  className={`style-choice ${dotStyle === style.value ? 'selected' : ''}`}
                  onClick={() => setDotStyle(style.value)}
                  aria-pressed={dotStyle === style.value}
                >
                  <span className={`style-thumb ${style.sample}`} aria-hidden="true"><i /></span>
                  <span>{style.label}</span>
                  {dotStyle === style.value && <Check className="choice-check" size={13} />}
                </button>
              ))}
            </div>
            <span className="field-label corner-label">CORNER EYES</span>
            <div className="choice-grid corner-grid">
              {cornerStyles.map((style) => (
                <button
                  type="button"
                  key={style.value}
                  className={`style-choice ${cornerStyle === style.value ? 'selected' : ''}`}
                  onClick={() => setCornerStyle(style.value)}
                  aria-pressed={cornerStyle === style.value}
                >
                  <span className={`corner-thumb ${style.sample}`} aria-hidden="true"><i /></span>
                  <span>{style.label}</span>
                  {cornerStyle === style.value && <Check className="choice-check" size={13} />}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <span className="step-number">03</span>
              <div><h2>Set the tone</h2><p>Choose a palette or pick your own.</p></div>
            </div>
            <div className="palette-row" aria-label="Color palettes">
              {palettes.map((palette) => {
                const isSelected = fgColor.toLowerCase() === palette.foreground.toLowerCase()
                  && bgColor.toLowerCase() === palette.background.toLowerCase()
                  && !isTransparentBg;
                return (
                  <button
                    key={palette.name}
                    type="button"
                    className={`palette-swatch ${isSelected ? 'selected' : ''}`}
                    onClick={() => applyPalette(palette)}
                    title={palette.name}
                    aria-label={`${palette.name} color palette`}
                    aria-pressed={isSelected}
                  >
                    <span style={{ backgroundColor: palette.foreground }} />
                    <span style={{ backgroundColor: palette.background }} />
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
            <div className="color-controls">
              <label className="color-picker">
                <span className="color-chip" style={{ backgroundColor: fgColor }} />
                <span><b>Pattern</b><small>{fgColor.toUpperCase()}</small></span>
                <input aria-label="Pattern color" type="color" value={fgColor} onChange={(event) => setFgColor(event.target.value)} />
              </label>
              <label className={`color-picker ${isTransparentBg ? 'muted' : ''}`}>
                <span className="color-chip" style={{ backgroundColor: bgColor }} />
                <span><b>Background</b><small>{isTransparentBg ? 'TRANSPARENT' : bgColor.toUpperCase()}</small></span>
                <input aria-label="Background color" type="color" value={bgColor} disabled={isTransparentBg} onChange={(event) => setBgColor(event.target.value)} />
              </label>
            </div>
            {hasLowContrast && (
              <div className="contrast-warning" role="status">
                <span className="warning-icon">!</span>
                <span>Low contrast may be hard to scan <small>{contrast.toFixed(1)}:1 · aim for 3.5:1 or higher</small></span>
                <button type="button" onClick={() => { setFgColor('#17211d'); setBgColor('#ffffff'); setIsTransparentBg(false); }}>
                  Auto-fix
                </button>
              </div>
            )}
            <label className="transparent-toggle">
              <span><b>Transparent background</b><small>Great for placing on colored designs</small></span>
              <input type="checkbox" checked={isTransparentBg} onChange={(event) => setIsTransparentBg(event.target.checked)} />
              <span className="toggle-track" aria-hidden="true"><span /></span>
            </label>
          </section>

          <section className="panel logo-panel">
            <div className="section-heading">
              <span className="step-number">04</span>
              <div><h2>Add your mark</h2><p>Place a logo in the center (optional).</p></div>
              <ImagePlus className="section-icon" size={19} />
            </div>
            {logoDataUrl ? (
              <div className="logo-preview-row">
                <img src={logoDataUrl} alt={`${logoName} logo preview`} />
                <div className="logo-preview-info">
                  <b>{logoName}</b>
                  <span>SIZE</span>
                  <div className="size-toggle" aria-label="Logo size">
                    {(['small', 'medium', 'large'] as LogoSize[]).map((size) => (
                      <button type="button" key={size} className={logoSize === size ? 'active' : ''} onClick={() => setLogoSize(size)} aria-pressed={logoSize === size}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="icon-button remove-logo" type="button" onClick={() => { setLogoDataUrl(null); setLogoName(''); }} aria-label="Remove logo"><Trash2 size={16} /></button>
              </div>
            ) : (
              <button
                type="button"
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => { event.preventDefault(); setIsDragging(false); void acceptLogo(event.dataTransfer.files[0]); }}
              >
                <span className="upload-icon"><Upload size={17} /></span>
                <span><b>Drop your logo here, or <u>browse</u></b><small>PNG, JPG, SVG or WebP · up to 5 MB</small></span>
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(event) => { void acceptLogo(event.target.files?.[0]); event.target.value = ''; }} />
              </button>
            )}
          </section>
        </section>

        <aside className="preview-column">
          <div className="preview-card">
            <div className="preview-topline">
              <div><p className="eyebrow">YOUR DESIGN</p><h2>Looking good.</h2></div>
              <span className="live-tag"><span /> LIVE PREVIEW</span>
            </div>
            <div className={`qr-stage ${isTransparentBg ? 'checkerboard' : ''}`}>
              <div className="qr-mount" ref={previewRef} role="img" aria-label={`Live QR code preview for ${urlInput.trim() || 'sample link'}`} />
              <span className="stage-corner top-left" /><span className="stage-corner top-right" />
              <span className="stage-corner bottom-left" /><span className="stage-corner bottom-right" />
            </div>
            <div className="preview-caption">
              <span><span className="caption-dot" /> {urlInput.trim() ? 'YOUR LINK' : 'SAMPLE PATTERN'}</span>
              <span>H · HIGH ERROR CORRECTION</span>
            </div>
            <p className="preview-url">{urlInput.trim() || PREVIEW_DATA}</p>
            <div className="print-size-row">
              <div><b>Export quality</b><small>Choose a print size</small></div>
              <select aria-label="Export size" value={exportSize} onChange={(event) => setExportSize(Number(event.target.value) as ExportSize)}>
                <option value={1024}>Web · 1024px</option>
                <option value={2048}>Print ready · 2048px</option>
                <option value={4096}>Large format · 4096px</option>
              </select>
            </div>
            <button type="button" className="download-button" onClick={() => void downloadQr()} disabled={isDownloading}>
              {isDownloading ? <RefreshCw className="spin" size={17} /> : <Download size={17} />}
              {isDownloading ? 'Preparing your QR…' : 'Download print PNG'}
              {!isDownloading && <ArrowUpRight size={16} className="download-arrow" />}
            </button>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            {notice && <p className="form-message success-message" role="status">{notice}</p>}
            <p className="download-footnote">High-resolution PNG · 20px quiet zone · Logo-safe settings</p>
          </div>
          <div className="safety-note">
            <span className="safety-icon"><Check size={15} /></span>
            <p><b>Built for real-world scanning</b><br />High error correction and a clear border help your QR code scan reliably.</p>
          </div>
          <p className="preview-disclaimer">Preview is a guide. Always test your downloaded code before printing in bulk.</p>
        </aside>
      </div>

      <footer className="footer">
        <span>QR STUDIO <span>© 2026</span></span>
        <span>GOOD DESIGN. EASY SCANS.</span>
      </footer>
    </main>
  );
}

export default App;
