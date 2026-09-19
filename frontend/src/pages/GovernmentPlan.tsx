import { useState } from 'react';
import { ArrowLeft, BarChart3, Clapperboard, FileText, Layers3, MapPinned, Search, UsersRound, X } from 'lucide-react';
import { CASCO_ICON } from '@/config';
import { governmentPlanDimensions, governmentPlanPages, governmentPlanStats } from '@/data/governmentPlan';
import './government-plan.css';

type GovernmentPlanProps = {
  onBack: () => void;
  onCreateVideo: () => void;
};

type PlanBlock = {
  type: 'caption' | 'heading' | 'list' | 'paragraph' | 'table';
  content: string;
};

const figureBase = `${import.meta.env.BASE_URL}plan-gobierno/`;

const planFigureCaptures = [
  { page: 6, title: 'Caracterización del distrito', description: 'Bloque de visión y ubicación inicial.' },
  { page: 7, title: 'Gráfico del distrito de Quiquijana', description: 'Mapa o gráfico territorial del PDF original.' },
  { page: 8, title: 'Medio ambiente e hidrografía', description: 'Cuadro de zonas de vida y datos ambientales.' },
  { page: 9, title: 'Clima y población', description: 'Clasificación climática y contexto poblacional.' },
  { page: 10, title: 'Análisis poblacional', description: 'Tabla poblacional por edad, sexo y área.' },
  { page: 12, title: 'Centros poblados', description: 'Continuación de centros poblados y viviendas.' },
  { page: 13, title: 'Indicadores sociales', description: 'Datos de IDH, pobreza y salud.' },
  { page: 14, title: 'Salud y aseguramiento', description: 'Cuadros de anemia, desnutrición y seguros.' },
  { page: 15, title: 'Cobertura de salud', description: 'Detalle de población por seguros y edad.' },
  { page: 18, title: 'Propuestas de salud', description: 'Metas, indicadores y acciones de gestión.' },
  { page: 20, title: 'Instituciones educativas', description: 'Listado visual de instituciones del distrito.' },
  { page: 23, title: 'Infraestructura educativa', description: 'Propuestas y mantenimiento de servicios.' },
  { page: 24, title: 'Alfabetización digital', description: 'Acciones educativas y conectividad.' },
  { page: 25, title: 'Vivienda y servicios', description: 'Tablas INEI sobre servicios básicos.' },
  { page: 26, title: 'Agua y saneamiento', description: 'Abastecimiento de agua por área censal.' },
  { page: 27, title: 'Alumbrado eléctrico', description: 'Indicadores de alumbrado por ámbito.' },
  { page: 30, title: 'Sistemas de agua', description: 'Medición y sostenibilidad de servicios.' },
  { page: 31, title: 'Uso actual de tierras', description: 'Cuadro de uso territorial.' },
  { page: 33, title: 'Turismo', description: 'Potencial turístico y recursos locales.' },
  { page: 34, title: 'Mercado laboral', description: 'Indicadores económicos y actividad.' },
  { page: 38, title: 'Formación productiva', description: 'Capacitación técnica y economía local.' },
  { page: 41, title: 'Gestión ambiental', description: 'Instrumentos y metas ambientales.' },
  { page: 42, title: 'Ingresos municipales', description: 'Datos institucionales y fuentes de ingreso.' }
].map(item => ({
  ...item,
  image: `${figureBase}pdf-page-${String(item.page).padStart(2, '0')}.jpg`
}));

const featuredPages = governmentPlanPages.filter(page =>
  /presentaci[oó]n|poblaci[oó]n|dimensi[oó]n social|dimensi[oó]n econ[oó]mica|dimensi[oó]n ambiental|institucional/i.test(page.title)
).slice(0, 8);

const figureByPage = new Map(planFigureCaptures.map(figure => [figure.page, figure]));

const headingPattern = /^(?:[IVX]+(?:\.\d+)?\.|\d+\.)\s+.{3,}$|^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .,;:()/-]{12,}$/;
const captionPattern = /^(?:Tabla|Cuadro|Gr[aá]fico|Figura|Fuente|Elaboraci[oó]n)\b/i;
const listPattern = /^\s*(?:\d+\.|[a-z]\)|[A-Z]\)|●|-)\s+/;

function isTableLine(line: string) {
  const clean = line.trim();
  if (clean.length < 18) return false;
  return /\s{2,}/.test(line) && (/\d/.test(clean) || /TOTAL|HOMBRES|MUJERES|DISTRITO|CENTROS|POBLACI[OÓ]N/i.test(clean));
}

function parsePlanPage(text: string) {
  const blocks: PlanBlock[] = [];
  let paragraph: string[] = [];
  let table: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', content: paragraph.join(' ').replace(/\s+/g, ' ').trim() });
    paragraph = [];
  };

  const flushTable = () => {
    if (!table.length) return;
    blocks.push({ type: 'table', content: table.join('\n') });
    table = [];
  };

  text.split('\n').forEach(line => {
    const clean = line.trim();

    if (!clean) {
      flushParagraph();
      flushTable();
      return;
    }

    if (isTableLine(line)) {
      flushParagraph();
      table.push(line);
      return;
    }

    flushTable();

    if (captionPattern.test(clean)) {
      flushParagraph();
      blocks.push({ type: 'caption', content: clean });
      return;
    }

    if (headingPattern.test(clean) && clean.length <= 110) {
      flushParagraph();
      blocks.push({ type: 'heading', content: clean });
      return;
    }

    if (listPattern.test(clean)) {
      flushParagraph();
      blocks.push({ type: 'list', content: clean });
      return;
    }

    paragraph.push(clean);
  });

  flushParagraph();
  flushTable();
  return blocks;
}

function PlanPageContent({ text }: { text: string }) {
  return (
    <div className="plan-page-body">
      {parsePlanPage(text).map((block, index) => {
        if (block.type === 'table') {
          return (
            <div className="plan-table-frame" key={`${block.type}-${index}`}>
              <pre className="plan-table">{block.content}</pre>
            </div>
          );
        }

        if (block.type === 'heading') return <h3 key={`${block.type}-${index}`}>{block.content}</h3>;
        if (block.type === 'caption') return <p className="plan-caption" key={`${block.type}-${index}`}>{block.content}</p>;
        if (block.type === 'list') return <p className="plan-list-line" key={`${block.type}-${index}`}>{block.content}</p>;
        return <p key={`${block.type}-${index}`}>{block.content}</p>;
      })}
    </div>
  );
}

export function GovernmentPlan({ onBack, onCreateVideo }: GovernmentPlanProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const visiblePages = normalizedQuery
    ? governmentPlanPages.filter(page => `${page.title} ${page.text}`.toLocaleLowerCase('es').includes(normalizedQuery))
    : governmentPlanPages;

  return (
    <main className="plan-shell">
      <header className="plan-hero">
        <div className="plan-brand">
          <img src={CASCO_ICON} alt="Ahora Nación" />
          <span>
            <strong>Ahora Nación</strong>
            <small>Quiquijana 2027 - 2030</small>
          </span>
        </div>

        <div className="plan-hero-copy">
          <p className="eyebrow">Nuestro plan de gobierno</p>
          <h1>Plan de Gobierno de Ahora Nación, Distrito de Quiquijana, Alcaldía 2027-2030</h1>
          <p>
            Consulta las 54 páginas del plan por partes, con datos clave de población,
            dimensiones de trabajo e índice para ubicar rápidamente cada sección.
          </p>
        </div>

        <div className="plan-actions">
          <button type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            Inicio
          </button>
          <button type="button" onClick={onCreateVideo}>
            <Clapperboard size={18} />
            Crear video
          </button>
        </div>
      </header>

      <section className="plan-overview" aria-label="Resumen del plan">
        <article className="plan-summary">
          <span className="plan-icon"><FileText size={18} /></span>
          <div>
            <strong>54 páginas</strong>
            <p>Plan completo extraído del PDF oficial y separado por páginas para lectura web.</p>
          </div>
        </article>
        <article className="plan-summary">
          <span className="plan-icon"><MapPinned size={18} /></span>
          <div>
            <strong>Distrito de Quiquijana</strong>
            <p>Caracterización territorial, centros poblados y necesidades priorizadas.</p>
          </div>
        </article>
        <article className="plan-summary">
          <span className="plan-icon"><Layers3 size={18} /></span>
          <div>
            <strong>4 dimensiones</strong>
            <p>Social, económica, ambiental e institucional, como exige el marco electoral.</p>
          </div>
        </article>
      </section>

      <section className="plan-stats" aria-label="Datos poblacionales">
        <div className="plan-section-title">
          <UsersRound size={18} />
          <span>Datos de población</span>
        </div>
        <div className="plan-stat-grid">
          {governmentPlanStats.map(stat => (
            <article className="plan-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <small>{stat.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="plan-dimensions" aria-label="Dimensiones del plan">
        <div className="plan-section-title">
          <BarChart3 size={18} />
          <span>Dimensiones principales</span>
        </div>
        <div className="plan-dimension-list">
          {governmentPlanDimensions.map((dimension, index) => (
            <span key={dimension}>{String(index + 1).padStart(2, '0')} {dimension}</span>
          ))}
        </div>
      </section>

      <section className="plan-captures" aria-label="Capturas visuales del PDF">
        <div className="plan-section-title">
          <FileText size={18} />
          <span>Gráficos y tablas del PDF</span>
        </div>
        <div className="plan-capture-grid">
          {planFigureCaptures.map(figure => (
            <a className="plan-capture-card" href={`#plan-page-${figure.page}`} key={figure.page}>
              <img src={figure.image} alt={figure.title} loading="lazy" />
              <span>Página {String(figure.page).padStart(2, '0')}</span>
              <strong>{figure.title}</strong>
              <small>{figure.description}</small>
            </a>
          ))}
        </div>
      </section>

      <section className="plan-reader" aria-label="Contenido completo del plan">
        <aside className="plan-index">
          <div className="plan-index-head">
            <strong>Índice rápido</strong>
            <span>{visiblePages.length} de {governmentPlanPages.length}</span>
          </div>
          <label className="plan-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Buscar en el plan</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar en el plan"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
                <X size={15} />
              </button>
            )}
          </label>
          <nav aria-label="Páginas destacadas del plan">
            {(normalizedQuery ? visiblePages : featuredPages).map(page => (
              <a href={`#plan-page-${page.page}`} key={page.page}>
                <span>{String(page.page).padStart(2, '0')}</span>
                {page.title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="plan-pages">
          {visiblePages.length === 0 && (
            <div className="plan-empty" role="status">
              <Search size={22} aria-hidden="true" />
              <strong>No encontramos esa búsqueda</strong>
              <p>Prueba con otra palabra o limpia el filtro para ver todo el documento.</p>
            </div>
          )}
          {visiblePages.map(page => (
            <article className="plan-page" id={`plan-page-${page.page}`} key={page.page}>
              <div className="plan-page-head">
                <span>Página {String(page.page).padStart(2, '0')}</span>
                <h2>{page.title}</h2>
              </div>
              {figureByPage.has(page.page) && (
                <figure className="plan-page-capture">
                  <img
                    src={figureByPage.get(page.page)?.image}
                    alt={figureByPage.get(page.page)?.title}
                    loading="lazy"
                  />
                  <figcaption>{figureByPage.get(page.page)?.description}</figcaption>
                </figure>
              )}
              <PlanPageContent text={page.text} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
