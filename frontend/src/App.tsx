import { useLayoutEffect, useRef, useState } from 'react';
import { Clapperboard, Download, ImagePlus, LayoutTemplate, Palette, Sparkles, Upload, WandSparkles } from 'lucide-react';

const CASCO_ICON = '/casco-an.jpg';
const CASCOS = ['Gobernador regional', 'Consejero regional', 'Alcalde provincial', 'Alcalde distrital'];

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
type Format = 'facebook' | 'tiktok';
const TEMPLATES = {
  facebook: { label: 'Imagen para Facebook', kind: 'image', width: 1080, height: 1350, ratio: '4:5', accept: 'image/jpeg,image/png,image/webp', files: 'JPG, PNG o WebP' },
  tiktok: { label: 'Video para TikTok', kind: 'video', width: 1080, height: 1920, ratio: '9:16', accept: 'video/mp4,video/webm', files: 'MP4 o WebM' }
} as const;
type Mode = 'minimal' | 'optimized';
type Asset = { url: string; kind: 'image' | 'video'; filename: string };

function App() {
  const [format, setFormat] = useState<Format>('facebook');
  const template = TEMPLATES[format];
  const [modes, setModes] = useState<Record<Format, Mode>>({ facebook: 'minimal', tiktok: 'minimal' });
  const mode = modes[format];
  const setMode = (value: Mode) => setModes(previous => ({ ...previous, [format]: value }));
  const [honorific, setHonorific] = useState('Ing.');
  const [title, setTitle] = useState('RICHARD MELO TTUPA');
  const [role, setRole] = useState('ALCALDE 2027 - 2030');
  const [subtitle, setSubtitle] = useState('JUVENTUD Y EXPERIENCIA');
  const [tagline, setTagline] = useState('al servicio del pueblo');
  const [district, setDistrict] = useState('QUIQUIJANA');
  const [accent, setAccent] = useState('#ed1c24');
  const [assets, setAssets] = useState<Record<Format, Asset | null>>({ facebook: null, tiktok: null });
  const asset = assets[format];
  const setAsset = (value: Asset) => setAssets(previous => ({ ...previous, [format]: value }));
  const posterRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [crop, setCrop] = useState({ x: 50, y: 50, zoom: 1.15 });
  const [exporting, setExporting] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; cropX: number; cropY: number } | null>(null);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [format, asset]);
  const scale = Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * crop.zoom;
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;
  const overflowX = Math.max(0, imageWidth - frameSize.width);
  const overflowY = Math.max(0, imageHeight - frameSize.height);
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const resetCrop = () => { setCrop({ x: 50, y: 50, zoom: 1.15 }); setNotice('Cambios sin guardar'); };
  const [saving, setSaving] = useState(false);
  const projectId = useRef<Record<Format, string | null>>({ facebook: null, tiktok: null });
  const busy = useRef(false);
  const [notice, setNotice] = useState('Cambios sin guardar');
  const [error, setError] = useState('');
  const [positions, setPositions] = useState<Record<Format, number>>({ facebook: 50, tiktok: 50 });
  const position = positions[format];
  const setPosition = (value: number) => setPositions(previous => ({ ...previous, [format]: value }));
  const selectTemplate = (value: Format) => { if (busy.current || exporting) return; setFormat(value); setError(''); setNotice('Cambios sin guardar'); if (fileRef.current) fileRef.current.value = ''; };
  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación');
    return body;
  };
  const persist = async () => {
    const project = await request(`${API}/api/projects${projectId.current[format] ? `/${projectId.current[format]}` : ''}`, {
      method: projectId.current[format] ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: title || 'Nuevo flyer', format, width: template.width, height: template.height, mode, config: { title, honorific, role, subtitle, tagline, district, accent, position, crop } })
    });
    projectId.current[format] = project.id;
    return project.id;
  };
  const saveProject = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try { await persist(); setNotice('Proyecto guardado'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Error al guardar'); }
    finally { busy.current = false; setSaving(false); }
  };
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadAsset = async (file: File) => {
    if (busy.current) return;
    if (!template.accept.split(',').includes(file.type) || file.size > 100 * 1024 * 1024) {
      setError(`Esta plantilla admite ${template.files} de hasta 100 MB.`); return;
    }
    busy.current = true; setSaving(true); setError('');
    try {
      const id = await persist();
      const data = new FormData(); data.append('file', file);
      const uploaded = await request(`${API}/api/projects/${id}/assets`, { method: 'POST', body: data });
      setAsset({ url: `${API}${uploaded.url}`, kind: uploaded.kind, filename: uploaded.filename });
      if (uploaded.kind === 'image') { resetCrop(); setNotice('Archivo guardado; encuadre sin guardar'); } else setNotice('Proyecto y archivo guardados');
    } catch (error) { setError(error instanceof Error ? error.message : 'Error al subir el archivo'); }
    finally { busy.current = false; setSaving(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const exportFlyer = async () => {
    if (!posterRef.current || !asset || format !== 'facebook' || busy.current) return;
    busy.current = true; setExporting(true); setError('');
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(posterRef.current.querySelectorAll('img')).map(image => image.decode()));
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(posterRef.current, {
        canvasWidth: template.width, canvasHeight: template.height, pixelRatio: 1,
        preferredFontFormat: 'woff2', style: { boxShadow: 'none' }
      });
      if (!blob) throw new Error('No se pudo generar la imagen');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${title.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0,70) || 'flyer'}-facebook.png`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo descargar la imagen'); }
    finally { busy.current = false; setExporting(false); }
  };

  return <main className="shell" onChange={() => setNotice('Cambios sin guardar')}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>flayer<span className="brand-dot">.</span>studio</span></div>
      <div className="top-actions"><span className="saved" role="status"><span className="status-dot" />{saving ? 'Guardando...' : notice}</span><button className="save-button" disabled={saving || exporting} onClick={saveProject}>Guardar</button>{format === 'facebook' && <button className="publish" disabled={saving || exporting || !asset} onClick={exportFlyer}><Download size={16} />{exporting ? 'Generando PNG...' : 'Descargar PNG'}</button>}</div>
    </header>

    {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')}>Cerrar</button></div>}<section className="workspace"><fieldset className="editor-fields" disabled={saving || exporting}>
      <aside className="sidebar left-panel">
        <div className="eyebrow">01 / lienzo</div>
        <h1>Crea algo<br /><em>que importe.</em></h1>
        <p className="intro">Un editor ligero para convertir una idea en un flyer listo para compartir.</p>
        <div className="control-group"><label>Plantilla</label>{(Object.keys(TEMPLATES) as Format[]).map(value => <button key={value} type="button" aria-pressed={format === value} className={`format-card ${format === value ? 'active' : ''}`} onClick={() => selectTemplate(value)}>{value === 'facebook' ? <ImagePlus size={18} /> : <Clapperboard size={18} />}<span><strong>{TEMPLATES[value].label}</strong><small>{TEMPLATES[value].width} × {TEMPLATES[value].height} px · {TEMPLATES[value].ratio}</small></span><span className="radio" /></button>)}</div>
        <div className="control-group"><label>Estilo</label><div className="segmented"><button className={mode === 'minimal' ? 'selected' : ''} onClick={() => { setMode('minimal'); setNotice('Cambios sin guardar'); }}><LayoutTemplate size={15} />Minimal</button><button className={mode === 'optimized' ? 'selected' : ''} onClick={() => { setMode('optimized'); setNotice('Cambios sin guardar'); }}><WandSparkles size={15} />Optimizada</button></div></div>
        <div className="control-group"><label>Color de acento</label><div className="color-row"><input aria-label="Color de acento" type="color" className="swatch" value={accent} onChange={e => setAccent(e.target.value)} /><span>{accent.toUpperCase()}</span><Palette size={15} /></div></div>
        <div className="tip"><Sparkles size={16} /><span>Consejo: usa una imagen nítida y deja aire alrededor del texto.</span></div>
      </aside>

      <section className="canvas-area"><div className="canvas-head"><span><ImagePlus size={14} /> Vista previa</span><span className="canvas-size">{template.ratio} · {template.width} × {template.height}</span></div><div ref={posterRef} className={`poster campaign-poster ${mode} template-${format} media-${template.kind}`} style={{ '--accent': accent, '--position': `${position}%` } as React.CSSProperties}>
        {asset?.kind === 'image' ? <div ref={frameRef} className="image-frame" tabIndex={0} role="group" aria-label="Encuadrar imagen. Usa las flechas para moverla."
          onPointerDown={event => {
            if (busy.current) return;
            event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y };
          }}
          onPointerMove={event => {
            const start = drag.current;
            if (!start || start.id !== event.pointerId) return;
            setCrop(previous => ({ ...previous,
              x: overflowX > 0 ? clamp(start.cropX - (event.clientX - start.x) / overflowX * 100) : 50,
              y: overflowY > 0 ? clamp(start.cropY - (event.clientY - start.y) / overflowY * 100) : 50 }));
            setNotice('Cambios sin guardar');
          }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
          onKeyDown={event => {
            if (busy.current || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            setCrop(previous => ({ ...previous, x: clamp(previous.x + (event.key === 'ArrowLeft' ? 2 : event.key === 'ArrowRight' ? -2 : 0)), y: clamp(previous.y + (event.key === 'ArrowUp' ? 2 : event.key === 'ArrowDown' ? -2 : 0)) }));
            setNotice('Cambios sin guardar');
          }}>
          <img src={asset.url} alt="Imagen del flyer" draggable={false} onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={{ width: imageWidth, height: imageHeight, left: -overflowX * crop.x / 100, top: -overflowY * crop.y / 100 }}
            onError={() => setError('No se pudo cargar la imagen.')} />
        </div> : asset?.kind === 'video' ? <video src={asset.url} onError={() => setError('No se pudo reproducir el video. Prueba un MP4 compatible.')} controls muted loop playsInline preload="metadata" /> : <div className="poster-placeholder"><ImagePlus size={32} /><span>{format === 'facebook' ? 'Añade una imagen para Facebook' : 'Añade un video para TikTok'}</span></div>}
        <div className="mark-badge"><div className="casco-tile"><img src={CASCO_ICON} alt="Símbolo Ahora Nación" /></div><strong>Marca así</strong>{district && <em>{district}</em>}</div>
        <div className="campaign-strip">
          <div className="campaign-col campaign-name"><span className="name-prefix">{honorific}</span><h2 className="name-first">{title.trim().split(/\s+/)[0]}</h2><h3 className="name-rest">{title.trim().split(/\s+/).slice(1).join(' ')}</h3></div>
          <div className="campaign-col campaign-center"><span className="pill">{role}</span><div className="campaign-slogan">{subtitle}</div><div className="campaign-tagline">{tagline}</div></div>
          <div className="campaign-col campaign-cascos">
            <span className="pill">Marca los 4 cascos</span>
            <div className="cascos-row">{CASCOS.map(c => <div className="casco" key={c}><div className="casco-tile"><img src={CASCO_ICON} alt="" /></div><span>{c}</span></div>)}</div>
          </div>
        </div>
      </div></section>

      <aside className="sidebar right-panel"><div className="eyebrow">02 / contenido</div><div className="panel-title"><h2>Tu composición</h2><span className="count">{format === 'tiktok' ? 'TikTok' : 'Facebook'}</span></div><div className="input-group"><label>Titular</label><input maxLength={70} value={title} onChange={e => setTitle(e.target.value)} /></div><div className="input-group"><label>Tratamiento</label><input maxLength={16} value={honorific} onChange={e => setHonorific(e.target.value)} /></div><div className="input-group"><label>Cargo</label><input maxLength={45} value={role} onChange={e => setRole(e.target.value)} /></div><div className="input-group"><label>Descripción</label><textarea maxLength={80} value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} /></div><div className="input-group"><label>Lema</label><input maxLength={80} value={tagline} onChange={e => setTagline(e.target.value)} /></div><div className="input-group"><label>Distrito</label><input maxLength={45} value={district} onChange={e => setDistrict(e.target.value)} /></div><div className="asset-drop" role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }} onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" hidden accept={template.accept} onChange={e => e.target.files?.[0] && uploadAsset(e.target.files[0])} /><div className="upload-icon">{saving ? <Sparkles size={20} /> : <Upload size={20} />}</div><strong>{saving ? 'Subiendo...' : format === 'facebook' ? 'Sube tu imagen' : 'Sube tu video'}</strong><span>{template.files} · máximo 100 MB</span></div>{asset && <div className="input-group media-settings"><p className="asset-name">{asset.filename}</p>{format === 'facebook' ? <>
          <p className="crop-hint">Arrastra la imagen para encuadrar.</p>
          <label htmlFor="zoom">Zoom {Math.round(crop.zoom * 100)}%</label><input id="zoom" type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={e => setCrop(previous => ({ ...previous, zoom: Number(e.target.value) }))} />
          <label htmlFor="crop-x">Horizontal</label><input id="crop-x" type="range" min="0" max="100" value={crop.x} onChange={e => setCrop(previous => ({ ...previous, x: Number(e.target.value) }))} />
          <label htmlFor="crop-y">Vertical</label><input id="crop-y" type="range" min="0" max="100" value={crop.y} onChange={e => setCrop(previous => ({ ...previous, y: Number(e.target.value) }))} />
          <button className="reset-crop" onClick={resetCrop}>Restablecer encuadre</button>
        </> : <><label htmlFor="position">Encuadre horizontal</label><input id="position" type="range" min="0" max="100" value={position} onChange={e => setPosition(Number(e.target.value))} /></>}</div>}</aside>
    </fieldset></section>
    <footer className="footer"><span><span className="live-dot" />Lienzo activo</span><span>Hecho para publicar rápido <span className="footer-mark">✦</span></span></footer>
  </main>;
}
export default App;
