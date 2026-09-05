import { useRef, useState } from 'react';
import { Clapperboard, Download, ImagePlus, LayoutTemplate, MonitorPlay, Palette, Play, Sparkles, Upload, WandSparkles } from 'lucide-react';

const CASCO_ICON = '/casco-an.jpg';
const CASCOS = ['Gobernador regional', 'Consejero regional', 'Alcalde provincial', 'Alcalde distrital'];

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
type Mode = 'minimal' | 'optimized';
type Asset = { url: string; kind: 'image' | 'video'; filename: string };

function App() {
  const [mode, setMode] = useState<Mode>('minimal');
  const [format, setFormat] = useState('tiktok');
  const [honorific, setHonorific] = useState('Ing.');
  const [title, setTitle] = useState('RICHARD MELO TTUPA');
  const [role, setRole] = useState('ALCALDE 2027 - 2030');
  const [subtitle, setSubtitle] = useState('JUVENTUD Y EXPERIENCIA');
  const [tagline, setTagline] = useState('al servicio del pueblo');
  const [district, setDistrict] = useState('QUIQUIJANA');
  const [accent, setAccent] = useState('#ed1c24');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const projectId = useRef<string | null>(null);
  const busy = useRef(false);
  const [notice, setNotice] = useState('Cambios sin guardar');
  const [error, setError] = useState('');
  const [position, setPosition] = useState(50);
  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación');
    return body;
  };
  const persist = async () => {
    const project = await request(`${API}/api/projects${projectId.current ? `/${projectId.current}` : ''}`, {
      method: projectId.current ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: title || 'Nuevo flyer', format, mode, config: { title, honorific, role, subtitle, tagline, district, accent, position } })
    });
    projectId.current = project.id;
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
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type) || file.size > 100 * 1024 * 1024) {
      setError('Usa JPG, PNG, WebP, MP4 o WebM de hasta 100 MB.'); return;
    }
    busy.current = true; setSaving(true); setError('');
    try {
      const id = await persist();
      const data = new FormData(); data.append('file', file);
      const uploaded = await request(`${API}/api/projects/${id}/assets`, { method: 'POST', body: data });
      setAsset({ url: `${API}${uploaded.url}`, kind: uploaded.kind, filename: uploaded.filename });
      setNotice('Proyecto y archivo guardados');
    } catch (error) { setError(error instanceof Error ? error.message : 'Error al subir el archivo'); }
    finally { busy.current = false; setSaving(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const exportFlyer = () => window.print();

  return <main className="shell" onChange={() => setNotice('Cambios sin guardar')}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>flayer<span className="brand-dot">.</span>studio</span></div>
      <div className="top-actions"><span className="saved"><span className="status-dot" />{saving ? 'Guardando...' : notice}</span><button className="save-button" disabled={saving} onClick={saveProject}>Guardar</button><button className="icon-button" title="Imprimir composición" aria-label="Imprimir composición" onClick={exportFlyer}><Download size={18} /></button><button className="publish" onClick={exportFlyer}><Play size={15} fill="currentColor" />Imprimir</button></div>
    </header>

    {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')}>Cerrar</button></div>}<section className="workspace"><fieldset className="editor-fields" disabled={saving}>
      <aside className="sidebar left-panel">
        <div className="eyebrow">01 / lienzo</div>
        <h1>Crea algo<br /><em>que importe.</em></h1>
        <p className="intro">Un editor ligero para convertir una idea en un flyer listo para compartir.</p>
        <div className="control-group"><label>Formato</label><button type="button" className={`format-card ${format === 'tiktok' ? 'active' : ''}`} onClick={() => { setFormat('tiktok'); setNotice('Cambios sin guardar'); }}><MonitorPlay size={18} /><span><strong>TikTok vertical</strong><small>1080 × 1920 px</small></span><span className="radio" /></button><button type="button" className={`format-card ${format === 'story' ? 'active' : ''}`} onClick={() => { setFormat('story'); setNotice('Cambios sin guardar'); }}><Clapperboard size={18} /><span><strong>Historia social</strong><small>1080 × 1920 px</small></span><span className="radio" /></button></div>
        <div className="control-group"><label>Estilo</label><div className="segmented"><button className={mode === 'minimal' ? 'selected' : ''} onClick={() => { setMode('minimal'); setNotice('Cambios sin guardar'); }}><LayoutTemplate size={15} />Minimal</button><button className={mode === 'optimized' ? 'selected' : ''} onClick={() => { setMode('optimized'); setNotice('Cambios sin guardar'); }}><WandSparkles size={15} />Optimizada</button></div></div>
        <div className="control-group"><label>Color de acento</label><div className="color-row"><input aria-label="Color de acento" type="color" className="swatch" value={accent} onChange={e => setAccent(e.target.value)} /><span>{accent.toUpperCase()}</span><Palette size={15} /></div></div>
        <div className="tip"><Sparkles size={16} /><span>Consejo: usa una imagen nítida y deja aire alrededor del texto.</span></div>
      </aside>

      <section className="canvas-area"><div className="canvas-head"><span><ImagePlus size={14} /> Vista previa</span><span className="canvas-size">9:16 · {mode}</span></div><div className={`poster campaign-poster ${mode} media-${asset?.kind || 'image'}`} style={{ '--accent': accent, '--position': `${position}%` } as React.CSSProperties}>
        {asset?.kind === 'image' ? <img src={asset.url} alt="Imagen del flyer" onError={() => setError('No se pudo cargar la imagen.')} /> : asset?.kind === 'video' ? <video src={asset.url} onError={() => setError('No se pudo reproducir el video. Prueba un MP4 compatible.')} controls muted loop playsInline preload="metadata" /> : <div className="poster-placeholder"><ImagePlus size={32} /><span>Añade una imagen o video</span></div>}
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

      <aside className="sidebar right-panel"><div className="eyebrow">02 / contenido</div><div className="panel-title"><h2>Tu composición</h2><span className="count">{asset?.kind === 'video' ? 'Video' : 'Imagen'}</span></div><div className="input-group"><label>Titular</label><input maxLength={70} value={title} onChange={e => setTitle(e.target.value)} /></div><div className="input-group"><label>Tratamiento</label><input maxLength={16} value={honorific} onChange={e => setHonorific(e.target.value)} /></div><div className="input-group"><label>Cargo</label><input maxLength={45} value={role} onChange={e => setRole(e.target.value)} /></div><div className="input-group"><label>Descripción</label><textarea maxLength={80} value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} /></div><div className="input-group"><label>Lema</label><input maxLength={80} value={tagline} onChange={e => setTagline(e.target.value)} /></div><div className="input-group"><label>Distrito</label><input maxLength={45} value={district} onChange={e => setDistrict(e.target.value)} /></div><div className="asset-drop" role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }} onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e => e.target.files?.[0] && uploadAsset(e.target.files[0])} /><div className="upload-icon">{saving ? <Sparkles size={20} /> : <Upload size={20} />}</div><strong>{saving ? 'Subiendo...' : 'Sube tu media'}</strong><span>JPG, PNG, WebP, MP4 o WebM · máximo 100 MB</span></div>{asset && <div className="input-group media-settings"><p className="asset-name">{asset.filename}</p><label htmlFor="position">Encuadre horizontal</label><input id="position" type="range" min="0" max="100" value={position} onChange={e => setPosition(Number(e.target.value))} /></div>}</aside>
    </fieldset></section>
    <footer className="footer"><span><span className="live-dot" />Lienzo activo</span><span>Hecho para publicar rápido <span className="footer-mark">✦</span></span></footer>
  </main>;
}
export default App;
