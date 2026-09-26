import type { CSSProperties, RefObject } from 'react';
import { ImagePlus } from 'lucide-react';
import { CASCO_ICON } from '@/config';
import handVoteIcon from '@/icons/hand-vote.svg';
import type { Asset, Mode } from '@/types';
import './tiktok.css';

type Props = {
  accent: string;
  asset: Asset | null;
  district: string;
  honorific: string;
  mode: Mode;
  onVideoError: () => void;
  position: number;
  posterRef: RefObject<HTMLDivElement | null>;
  role: string;
  subtitle: string;
  tagline: string;
  title: string;
};

function parts(value: string) {
  const words = value.trim().split(/\s+/);
  const first = words[0] || 'RICHARD';
  const rest = words.slice(1).join(' ') || 'MELO TTUPA';
  return { first, rest };
}

export function TiktokFlyer(props: Props) {
  const name = parts(props.title);

  return (
    <div ref={props.posterRef} className={`poster tiktok-flyer ${props.mode}`} style={{ '--accent': props.accent, '--position': `${props.position}%` } as CSSProperties}>
      <div className="video-frame">
        {props.asset?.kind === 'video' ? (
          <video src={props.asset.url} onError={props.onVideoError} autoPlay muted loop playsInline preload="metadata" />
        ) : (
          <div className="poster-placeholder"><ImagePlus size={32} /><span>Añade un video para TikTok</span></div>
        )}
      </div>

      <div className="video-topbar">
        <div className="header-mark">
          <img src={CASCO_ICON} alt="Logo Ahora Nación" />
          <span className="mark-x" aria-hidden="true" />
          <img className="mark-hand" src={handVoteIcon} alt="" />
        </div>
        <span>Ahora<span>Nación</span></span>
        {props.district && <strong>{props.district}</strong>}
      </div>

      <div className="video-copy">
        <span className="video-honorific">{props.honorific}</span>
        <strong>{name.first}</strong>
        <small>{name.rest}</small>
        <em>{props.role}</em>
        <span>{props.subtitle}</span>
      </div>

      <div className="video-endcard">
        <span className="endcard-line">{props.tagline}</span>
      </div>
    </div>
  );
}
