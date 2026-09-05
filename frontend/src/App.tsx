import { useRef, useState } from 'react';
import { Clapperboard, Download, ImagePlus, LayoutTemplate, MonitorPlay, Move, Palette, Play, Plus, Sparkles, Upload, Video, WandSparkles } from 'lucide-react';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadAsset = async (file: File) => {
    setSaving(true);
    try {
      const projectResponse = await fetch(`${API}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: title, format, mode, config: { title, subtitle, accent } }) });
      const project = await projectResponse.json();
      const data = new FormData();
      data.append('file', file);
      const response = await fetch(`${API}/api/projects/${project.id}/assets`, { method: 'POST', body: data });
      const uploaded = await response.json();
      setAsset({ url: `${API}${uploaded.url}`, kind: uploaded.kind, filename: uploaded.filename });
    } finally { setSaving(false); }
  };

  const exportFlyer = () => window.print();

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>flayer<span className="brand-dot">.</span>studio</span></div>
      <div className="top-actions"><span className="saved"><span className="status-dot" />Todos los cambios guardados</span><button className="icon-button" title="Exportar" onClick={exportFlyer}><Download size={18} /></button><button className="publish" onClick={exportFlyer}><Play size={15} fill="currentColor" />Exportar</button></div>
    </header>

    <section className="workspace">
      <aside className="sidebar left-panel">
        <div className="eyebrow">01 / lienzo</div>
        <h1>Crea algo<br /><em>que importe.</em></h1>
        <p className="intro">Un editor ligero para convertir una idea en un flyer listo para compartir.</p>
        <div className="control-group"><label>Formato</label><div className="format-card active"><MonitorPlay size={18} /><span><strong>TikTok vertical</strong><small>1080 × 1920 px</small></span><span className="radio" /></div><div className="format-card" onClick={() => setFormat('story')}><Clapperboard size={18} /><span><strong>Historia social</strong><small>1080 × 1920 px</small></span><span className="radio" /></div></div>
        <div className="control-group"><label>Estilo</label><div className="segmented"><button className={mode === 'minimal' ? 'selected' : ''} onClick={() => setMode('minimal')}><LayoutTemplate size={15} />Minimal</button><button className={mode === 'optimized' ? 'selected' : ''} onClick={() => setMode('optimized')}><WandSparkles size={15} />Optimizada</button></div></div>
        <div className="control-group"><label>Color de acento</label><div className="color-row"><button className="swatch" style={{ background: accent }} onClick={() => setAccent(accent === '#e45a3b' ? '#1e6b60' : '#e45a3b')} /><span>{accent.toUpperCase()}</span><Palette size={15} /></div></div>
        <div className="tip"><Sparkles size={16} /><span>Consejo: usa una imagen nítida y deja aire alrededor del texto.</span></div>
      </aside>

      <section className="canvas-area"><div className="canvas-head"><span><Move size={14} /> Arrastra para encuadrar</span><span className="canvas-size">9:16 · {mode}</span></div><div className={`poster campaign-poster ${mode}`} style={{ '--accent': accent } as React.CSSProperties}>
        {asset?.kind === 'image' ? <img src={asset.url} alt="Imagen del flyer" /> : asset?.kind === 'video' ? <video src={asset.url} controls autoPlay muted loop /> : <div className="poster-placeholder"><ImagePlus size={32} /><span>Añade una imagen o video</span></div>}
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

      <aside className="sidebar right-panel"><div className="eyebrow">02 / contenido</div><div className="panel-title"><h2>Tu composición</h2><span className="count">3 capas</span></div><div className="input-group"><label>Titular</label><input value={title} onChange={e => setTitle(e.target.value)} /></div><div className="input-group"><label>Tratamiento</label><input value={honorific} onChange={e => setHonorific(e.target.value)} /></div><div className="input-group"><label>Cargo</label><input value={role} onChange={e => setRole(e.target.value)} /></div><div className="input-group"><label>Descripción</label><textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} /></div><div className="input-group"><label>Lema</label><input value={tagline} onChange={e => setTagline(e.target.value)} /></div><div className="input-group"><label>Distrito</label><input value={district} onChange={e => setDistrict(e.target.value)} /></div><div className="asset-drop" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={e => e.target.files?.[0] && uploadAsset(e.target.files[0])} /><div className="upload-icon">{saving ? <Sparkles size={20} /> : <Upload size={20} />}</div><strong>{saving ? 'Subiendo...' : 'Sube tu media'}</strong><span>JPG, PNG o MP4 · máximo 100 MB</span></div><div className="layer-list"><div className="layer"><span className="layer-grip">⠿</span><ImagePlus size={16} /><span>Imagen principal</span><span className="eye">◉</span></div><div className="layer"><span className="layer-grip">⠿</span><TypeIcon /><span>Texto y marca</span><span className="eye">◉</span></div></div><button className="add-layer"><Plus size={16} /> Añadir capa</button></aside>
    </section>
    <footer className="footer"><span><span className="live-dot" />Lienzo activo</span><span>Hecho para publicar rápido <span className="footer-mark">✦</span></span></footer>
  </main>;
}
function TypeIcon() { return <span className="type-icon">T</span>; }
export default App;
