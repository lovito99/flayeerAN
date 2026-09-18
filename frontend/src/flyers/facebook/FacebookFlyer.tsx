import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react';
import { ImagePlus } from 'lucide-react';
import { CASCO_ICON, CASCOS } from '@/config';
import handVoteIcon from '@/icons/hand-vote.svg';
import type { Asset, Mode } from '@/types';
import './facebook.css';
import './variants/diagonal.css';
import './variants/editorial.css';
import './variants/minimal.css';
import './variants/optimized.css';
import './variants/soft.css';

type Props = {
  accent: string;
  asset: Asset | null;
  district: string;
  frameRef: RefObject<HTMLDivElement | null>;
  honorific: string;
  imageHeight: number;
  imageWidth: number;
  left: number;
  mode: Mode;
  onImageLoad: (width: number, height: number) => void;
  onImageError: () => void;
  onKeyMove: (event: KeyboardEvent<HTMLDivElement>) => void;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onMoveCancel: () => void;
  onMoveStart: (event: PointerEvent<HTMLDivElement>) => void;
  posterRef: RefObject<HTMLDivElement | null>;
  role: string;
  subtitle: string;
  tagline: string;
  title: string;
  top: number;
};

function parts(value: string) {
  const words = value.trim().split(/\s+/);
  const first = words[0] || 'RICHARD';
  const rest = words.slice(1).join(' ') || 'MELO TTUPA';
  return { first, rest };
}

export function FacebookFlyer(props: Props) {
  const name = parts(props.title);

  return (
    <div
      ref={props.posterRef}
      className={`poster facebook-flyer facebook-${props.mode}`}
      style={{ '--accent': props.accent } as CSSProperties}
    >
      {props.asset?.kind === 'image' ? (
        <div
          ref={props.frameRef}
          className="image-frame"
          tabIndex={0}
          role="group"
          aria-label="Encuadrar imagen. Usa las flechas para moverla."
          onPointerDown={props.onMoveStart}
          onPointerMove={props.onMove}
          onPointerUp={props.onMoveCancel}
          onPointerCancel={props.onMoveCancel}
          onLostPointerCapture={props.onMoveCancel}
          onKeyDown={props.onKeyMove}
        >
          <img
            src={props.asset.url}
            alt="Imagen del flyer"
            draggable={false}
            onLoad={event => props.onImageLoad(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
            style={{ width: props.imageWidth, height: props.imageHeight, left: props.left, top: props.top }}
            onError={props.onImageError}
          />
        </div>
      ) : (
        <div className="poster-placeholder"><ImagePlus size={32} /><span>Anade una imagen para Facebook</span></div>
      )}

      <div className="header-badge">
        <img className="header-helmet" src={CASCO_ICON} alt="Casco Ahora Nacion" />
        <strong>
          <span>Ahora</span>
          <span>Nacion</span>
        </strong>
        {props.district && <em>{props.district}</em>}
      </div>

      <div className="campaign-strip">
        <div className="campaign-col campaign-name">
          <span className="name-prefix">{props.honorific}</span>
          <h2 className="name-first">{name.first}</h2>
          <h3 className="name-rest">{name.rest}</h3>
        </div>
        <div className="campaign-col campaign-center">
          <div className="campaign-tagline">{props.tagline}</div>
          <div className="campaign-slogan">{props.subtitle}</div>
        </div>
        <div className="campaign-col campaign-cascos">
          <span className="role-line">{props.role}</span>
          <span className="pill">Marca los 4 cascos</span>
          <div className="cascos-row">
            {CASCOS.map((casco, index) => (
              <div className="casco" key={casco}>
                <div className="casco-tile"><img src={CASCO_ICON} alt="" /></div>
                <span>{casco}</span>
                {index === CASCOS.length - 1 && <img className="casco-hand" src={handVoteIcon} alt="" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
