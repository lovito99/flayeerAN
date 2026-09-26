import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ArrowLeft, CheckCircle2, Clapperboard, Download, FileText, ImagePlus, LayoutTemplate, Megaphone, Palette, Share2, Sparkles, Upload, WandSparkles, X } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa6';
import { assetUrl, saveProject as saveProjectRequest, uploadProjectAsset } from '@/api';
import { CASCO_ICON, STYLE_OPTIONS, TEMPLATES } from '@/config';
import { FacebookFlyer } from '@/flyers/facebook/FacebookFlyer';
import { TiktokFlyer } from '@/flyers/tiktok/TiktokFlyer';
import { GovernmentPlan } from '@/pages/GovernmentPlan';
import type { Asset, Format, Mode } from '@/types';

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const homePath = `${basePath}/`;
const planPath = `${basePath}/plan-gobierno`;
const cleanPath = () => window.location.pathname.replace(/\/$/, '') || '/';
const isPlanRoute = () => cleanPath() === planPath;

function setPageMeta(title: string, description: string) {
  document.title = title;

  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDescription) metaDescription.content = description;
}

function App() {
  const [started, setStarted] = useState(false);
  const [showPlan, setShowPlan] = useState(isPlanRoute);
  const [format, setFormat] = useState<Format>('facebook');
  const template = TEMPLATES[format];
  const [modes, setModes] = useState<Record<Format, Mode>>({ facebook: 'minimal', tiktok: 'minimal' });
  const mode = modes[format];
  const [honorific, setHonorific] = useState('Ing.');
  const [title, setTitle] = useState('RICHARD MELO TTUPA');
  const [role, setRole] = useState('ALCALDE 2027 - 2030');
  const [subtitle, setSubtitle] = useState('JUVENTUD Y EXPERIENCIA');
  const [tagline, setTagline] = useState('al servicio del pueblo');
  const [district, setDistrict] = useState('QUIQUIJANA');
  const [accent, setAccent] = useState('#ed1c24');
  const [assets, setAssets] = useState<Record<Format, Asset | null>>({ facebook: null, tiktok: null });
  const [crop, setCrop] = useState({ x: 50, y: 50, zoom: 1.15 });
  const [positions, setPositions] = useState<Record<Format, number>>({ facebook: 50, tiktok: 50 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('Cambios sin guardar');
  const [error, setError] = useState('');
  const [mobileModal, setMobileModal] = useState<'design' | 'content' | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectId = useRef<Record<Format, string | null>>({ facebook: null, tiktok: null });
  const busy = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; cropX: number; cropY: number } | null>(null);

  const asset = assets[format];
  const position = positions[format];
  const scale = Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * crop.zoom;
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;
  const overflowX = Math.max(0, imageWidth - frameSize.width);
  const overflowY = Math.max(0, imageHeight - frameSize.height);
  const imageLeft = -overflowX * crop.x / 100;
  const imageTop = -overflowY * crop.y / 100;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(frame);
    return () => observer.disconnect();
  }, [format, asset]);

  useEffect(() => {
    const syncRoute = () => {
      const planRoute = isPlanRoute();
      setShowPlan(planRoute);
      if (planRoute) setStarted(false);
    };

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (showPlan) {
      setPageMeta(
        'Plan de Gobierno 2027-2030 | Ahora Nación Quiquijana',
        'Consulta el plan de gobierno de Ahora Nación para el distrito de Quiquijana, con propuestas por dimensiones, datos poblacionales y capturas del PDF.'
      );
      return;
    }

    setPageMeta(
      'Creador de Flyers | Ahora Nación Quiquijana',
      'Crea flyers y videos de campaña de Ahora Nación Quiquijana para Facebook, WhatsApp, TikTok y Reels.'
    );
  }, [showPlan]);

  const markDirty = () => setNotice('Cambios sin guardar');
  const setMode = (value: Mode) => {
    setModes(previous => ({ ...previous, [format]: value }));
    markDirty();
  };
  const setAsset = (value: Asset) => setAssets(previous => ({ ...previous, [format]: value }));
  const setPosition = (value: number) => setPositions(previous => ({ ...previous, [format]: value }));
  const chooseAsset = () => {
    if (busy.current || saving || exporting) return;
    fileRef.current?.click();
  };
  const removeAsset = () => {
    if (busy.current || saving || exporting) return;
    setAssets(previous => ({ ...previous, [format]: null }));
    if (fileRef.current) fileRef.current.value = '';
    setNotice('Archivo quitado; cambios sin guardar');
    markDirty();
  };
  const resetCrop = () => {
    setCrop({ x: 50, y: 50, zoom: 1.15 });
    markDirty();
  };

  const selectTemplate = (value: Format) => {
    if (busy.current || exporting) return;
    setFormat(value);
    setError('');
    markDirty();
    if (fileRef.current) fileRef.current.value = '';
  };

  const startTemplate = (value: Format) => {
    selectTemplate(value);
    window.history.pushState(null, '', homePath);
    setShowPlan(false);
    setStarted(true);
  };

  const openPlan = () => {
    window.history.pushState(null, '', planPath);
    setStarted(false);
    setShowPlan(true);
  };

  const goHome = () => {
    window.history.pushState(null, '', homePath);
    setStarted(false);
    setShowPlan(false);
  };

  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y };
  };

  const moveImage = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;

    setCrop(previous => ({
      ...previous,
      x: overflowX > 0 ? clamp(start.cropX - ((event.clientX - start.x) / overflowX) * 100) : 50,
      y: overflowY > 0 ? clamp(start.cropY - ((event.clientY - start.y) / overflowY) * 100) : 50
    }));
    markDirty();
  };

  const stopMove = () => {
    drag.current = null;
  };

  const keyMove = (event: KeyboardEvent<HTMLDivElement>) => {
    if (busy.current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setCrop(previous => ({
      ...previous,
      x: clamp(previous.x + (event.key === 'ArrowLeft' ? 2 : event.key === 'ArrowRight' ? -2 : 0)),
      y: clamp(previous.y + (event.key === 'ArrowUp' ? 2 : event.key === 'ArrowDown' ? -2 : 0))
    }));
    markDirty();
  };

  const persist = async () => {
    const project = await saveProjectRequest({
      projectId: projectId.current[format],
      title,
      honorific,
      role,
      subtitle,
      tagline,
      district,
      accent,
      position,
      crop,
      format,
      mode,
      width: template.width,
      height: template.height
    });

    projectId.current[format] = project.id;
    return project.id;
  };

  const saveProject = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');

    try {
      await persist();
      setNotice('Proyecto guardado');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const uploadAsset = async (file: File) => {
    if (busy.current) return;

    if (!template.accept.split(',').includes(file.type) || file.size > 100 * 1024 * 1024) {
      setError(`Esta plantilla admite ${template.files} de hasta 100 MB.`);
      return;
    }

    busy.current = true;
    setSaving(true);
    setError('');

    try {
      const id = await persist();
      const uploaded = await uploadProjectAsset(id, file);
      setAsset({ url: assetUrl(uploaded.url), kind: uploaded.kind, filename: uploaded.filename });
      if (uploaded.kind === 'image') {
        resetCrop();
        setNotice('Archivo guardado; encuadre sin guardar');
      } else {
        setNotice('Proyecto y archivo guardados');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al subir el archivo');
    } finally {
      busy.current = false;
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const exportFlyer = async () => {
    if (!posterRef.current || !asset || format !== 'facebook' || busy.current) return;
    busy.current = true;
    setExporting(true);
    setError('');

    try {
      await document.fonts.ready;
      await Promise.all(Array.from(posterRef.current.querySelectorAll('img')).map(image => image.decode()));
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(posterRef.current, {
        canvasWidth: template.width,
        canvasHeight: template.height,
        pixelRatio: 1,
        preferredFontFormat: 'woff2',
        style: { boxShadow: 'none' },
        filter: node => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true')
      });

      if (!blob) throw new Error('No se pudo generar la imagen');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 70) || 'flyer'}-facebook.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo descargar la imagen');
    } finally {
      busy.current = false;
      setExporting(false);
    }
  };

  if (!started && showPlan) {
    return <GovernmentPlan onBack={goHome} onCreateVideo={() => startTemplate('tiktok')} />;
  }

  if (!started) {
    return (
      <main className="welcome-shell">
        <section className="welcome-card" aria-labelledby="welcome-title">
          <div className="welcome-brand">
            <img src={CASCO_ICON} alt="Ahora Nación" />
            <span>
              <strong>Ahora Nación</strong>
              <small>Quiquijana</small>
            </span>
          </div>

          <div className="welcome-copy">
            <p className="eyebrow">Editor de campaña</p>
            <h1 id="welcome-title">Elige que vas a crear</h1>
            <p>
              Prepara materiales listos para simpatizantes y equipos de apoyo. Usa imágenes para Facebook y WhatsApp,
              o videos para Reels y TikTok; cada pieza mantiene la misma línea gráfica para difundir la campaña con orden.
            </p>
          </div>

          <div className="welcome-actions">
            <button type="button" onClick={() => startTemplate('facebook')}>
              <ImagePlus size={22} />
              <span>
                <strong>Editar imagen</strong>
                <small>Flyer para Facebook y WhatsApp</small>
                <span className="action-platforms" aria-label="Redes para imagen">
                  <span className="platform-badge social-facebook"><FaFacebookF /></span>
                  <span className="platform-badge social-whatsapp"><FaWhatsapp /></span>
                </span>
              </span>
            </button>
            <button type="button" onClick={() => startTemplate('tiktok')}>
              <Clapperboard size={22} />
              <span>
                <strong>Editar video</strong>
                <small>Video para TikTok y Facebook</small>
                <span className="action-platforms" aria-label="Redes para video">
                  <span className="platform-badge social-tiktok"><FaTiktok /></span>
                  <span className="platform-badge social-facebook"><FaFacebookF /></span>
                </span>
              </span>
            </button>
            <button type="button" onClick={openPlan}>
              <FileText size={22} />
              <span><strong>Plan de gobierno</strong><small>Ver propuestas por ejes</small></span>
            </button>
          </div>

          <div className="welcome-note">
            <strong>Antes de empezar</strong>
            <span>Elige imagen, video o plan. El editor mantiene el estilo de campaña listo para publicar.</span>
          </div>

          <div className="welcome-support">
            <div>
              <span className="support-label">Que incluye</span>
              <div className="welcome-benefits" aria-label="Beneficios del editor">
                <span><Megaphone size={16} /> Mensaje claro</span>
                <span><Share2 size={16} /> Listo para compartir</span>
                <span><CheckCircle2 size={16} /> Línea gráfica uniforme</span>
              </div>
            </div>
            <div>
              <span className="support-label">Canales de publicacion</span>
              <div className="welcome-socials" aria-label="Canales recomendados">
                <span className="social-whatsapp"><FaWhatsapp /> WhatsApp</span>
                <span className="social-facebook"><FaFacebookF /> Facebook</span>
                <span className="social-tiktok"><FaTiktok /> TikTok</span>
                <span className="social-instagram"><FaInstagram /> Reels</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" onChange={markDirty}>
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src={CASCO_ICON} alt="Casco de Ahora Nación" />
          <span className="brand-name">Ahora Nación<span className="brand-subtitle">Creador de Flyers</span></span>
        </div>
        <div className="top-actions">
          <button className="save-button back-home" type="button" onClick={goHome}><ArrowLeft size={15} />Inicio</button>
          <span className="saved" role="status"><span className="status-dot" />{saving ? 'Guardando...' : notice}</span>
          <button className="save-button" disabled={saving || exporting} onClick={saveProject}>Guardar</button>
          {format === 'facebook' && <button className="publish" disabled={saving || exporting || !asset} onClick={exportFlyer}><Download size={16} />{exporting ? 'Generando PNG...' : 'Descargar PNG'}</button>}
        </div>
      </header>

      {error && <div className="alert" role="alert">{error}<button onClick={() => setError('')}>Cerrar</button></div>}

      <section className="workspace">
        <fieldset className="editor-fields" disabled={saving || exporting}>
          {mobileModal && <button className="mobile-modal-backdrop" type="button" aria-label="Cerrar panel" onClick={() => setMobileModal(null)} />}

          <aside className={`sidebar left-panel ${mobileModal === 'design' ? 'mobile-modal-open' : ''}`}>
            <button className="mobile-modal-close" type="button" aria-label="Cerrar estilos" onClick={() => setMobileModal(null)}><X size={18} /></button>
            <div className="eyebrow">01 / lienzo</div>
            <h1>Crea algo<br /><em>que importe.</em></h1>
            <p className="intro">Un editor ligero para convertir una idea en un flyer listo para compartir.</p>

            <div className="control-group">
              <label>Plantilla</label>
              {(Object.keys(TEMPLATES) as Format[]).map(value => (
                <button key={value} type="button" aria-pressed={format === value} className={`format-card ${format === value ? 'active' : ''}`} onClick={() => selectTemplate(value)}>
                  {value === 'facebook' ? <ImagePlus size={18} /> : <Clapperboard size={18} />}
                  <span><strong>{TEMPLATES[value].label}</strong><small>{TEMPLATES[value].width} x {TEMPLATES[value].height} px - {TEMPLATES[value].ratio}</small></span>
                  <span className="radio" />
                </button>
              ))}
            </div>

            <div className="control-group">
              <label id="style-label">Estilo</label>
              <div className="style-options" role="group" aria-labelledby="style-label">
                {STYLE_OPTIONS.filter(style => !style.facebookOnly || format === 'facebook').map(style => (
                  <button key={style.value} type="button" aria-pressed={mode === style.value} className={`style-option ${mode === style.value ? 'selected' : ''}`} onClick={() => setMode(style.value)}>
                    <span className={`style-preview style-preview-${style.value}`} aria-hidden="true"><span /></span>
                    <span><strong>{style.label}</strong><small>{style.description}</small></span>
                    {style.value === 'optimized' ? <WandSparkles size={15} /> : <LayoutTemplate size={15} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Color de acento</label>
              <div className="color-row">
                <input aria-label="Color de acento" type="color" className="swatch" value={accent} onChange={event => setAccent(event.target.value)} />
                <span>{accent.toUpperCase()}</span>
                <Palette size={15} />
              </div>
            </div>

            <div className="tip"><Sparkles size={16} /><span>Consejo: usa una imagen nitida y deja aire alrededor del texto.</span></div>
          </aside>

          <section className="canvas-area">
            <div className="mobile-editor-actions" aria-label="Controles del editor">
              <button type="button" onClick={() => setMobileModal('design')}><Palette size={16} /> Estilo</button>
              <button type="button" onClick={() => setMobileModal('content')}><LayoutTemplate size={16} /> Editar contenido</button>
            </div>
            <div className="canvas-head"><span><ImagePlus size={14} /> Vista previa</span><span className="canvas-size">{template.ratio} - {template.width} x {template.height}</span></div>
            {format === 'facebook' ? (
              <FacebookFlyer
                accent={accent}
                asset={asset}
                district={district}
                frameRef={frameRef}
                honorific={honorific}
                imageHeight={imageHeight}
                imageWidth={imageWidth}
                left={imageLeft}
                mode={mode}
                onImageError={() => setError('No se pudo cargar la imagen.')}
                onImageLoad={(width, height) => setImageSize({ width, height })}
                onKeyMove={keyMove}
                onMove={moveImage}
                onMoveCancel={stopMove}
                onMoveStart={startMove}
                onRemoveAsset={removeAsset}
                onSelectAsset={chooseAsset}
                posterRef={posterRef}
                role={role}
                subtitle={subtitle}
                tagline={tagline}
                title={title}
                top={imageTop}
              />
            ) : (
              <TiktokFlyer
                accent={accent}
                asset={asset}
                district={district}
                honorific={honorific}
                mode={mode}
                onRemoveAsset={removeAsset}
                onSelectAsset={chooseAsset}
                onVideoError={() => setError('No se pudo reproducir el video. Prueba un MP4 compatible.')}
                position={position}
                posterRef={posterRef}
                role={role}
                subtitle={subtitle}
                tagline={tagline}
                title={title}
              />
            )}
          </section>

          <aside className={`sidebar right-panel ${mobileModal === 'content' ? 'mobile-modal-open' : ''}`}>
            <button className="mobile-modal-close" type="button" aria-label="Cerrar edición de contenido" onClick={() => setMobileModal(null)}><X size={18} /></button>
            <div className="eyebrow">02 / contenido</div>
            <div className="panel-title"><h2>Tu composición</h2><span className="count">{format === 'tiktok' ? 'TikTok' : 'Facebook'}</span></div>
            <div className="input-group"><label>Titular</label><input maxLength={70} value={title} onChange={event => setTitle(event.target.value)} /></div>
            <div className="input-group"><label>Tratamiento</label><input maxLength={16} value={honorific} onChange={event => setHonorific(event.target.value)} /></div>
            <div className="input-group"><label>Cargo</label><input maxLength={45} value={role} onChange={event => setRole(event.target.value)} /></div>
            <div className="input-group"><label>Descripción</label><textarea maxLength={80} value={subtitle} onChange={event => setSubtitle(event.target.value)} rows={2} /></div>
            <div className="input-group"><label>Lema</label><input maxLength={80} value={tagline} onChange={event => setTagline(event.target.value)} /></div>
            <div className="input-group"><label>Distrito</label><input maxLength={45} value={district} onChange={event => setDistrict(event.target.value)} /></div>
            <div className="asset-drop" role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseAsset(); } }} onClick={chooseAsset}>
              <input ref={fileRef} type="file" hidden accept={template.accept} onChange={event => event.target.files?.[0] && uploadAsset(event.target.files[0])} />
              <div className="upload-icon">{saving ? <Sparkles size={20} /> : <Upload size={20} />}</div>
              <strong>{saving ? 'Subiendo...' : asset ? 'Cambiar archivo' : format === 'facebook' ? 'Sube tu imagen' : 'Sube tu video'}</strong>
              <span>{asset ? asset.filename : `${template.files} - máximo 100 MB`}</span>
            </div>
            {asset && <div className="input-group media-settings"><div className="asset-toolbar"><p className="asset-name">{asset.filename}</p><button type="button" onClick={removeAsset}>Quitar</button></div>{format === 'facebook' ? <>
              <p className="crop-hint">Arrastra la imagen para encuadrar.</p>
              <label htmlFor="zoom">Zoom {Math.round(crop.zoom * 100)}%</label><input id="zoom" type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={event => setCrop(previous => ({ ...previous, zoom: Number(event.target.value) }))} />
              <label htmlFor="crop-x">Horizontal</label><input id="crop-x" type="range" min="0" max="100" value={crop.x} onChange={event => setCrop(previous => ({ ...previous, x: Number(event.target.value) }))} />
              <label htmlFor="crop-y">Vertical</label><input id="crop-y" type="range" min="0" max="100" value={crop.y} onChange={event => setCrop(previous => ({ ...previous, y: Number(event.target.value) }))} />
              <button className="reset-crop" onClick={resetCrop}>Restablecer encuadre</button>
            </> : <>
              <label htmlFor="position">Encuadre horizontal</label><input id="position" type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))} />
            </>}</div>}
          </aside>
        </fieldset>
      </section>
      <footer className="footer"><span><span className="live-dot" />Lienzo activo</span><span>Hecho para publicar rápido <span className="footer-mark">*</span></span></footer>
    </main>
  );
}

export default App;
