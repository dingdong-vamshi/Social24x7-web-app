import { useState } from 'react';

/** A missing legacy object must not leave a broken image or unusable player. */
export function AvailableMedia({ src, alt, video = false, className, onEnded }: {
  src: string; alt: string; video?: boolean; className?: string; onEnded?: () => void;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <p className="social-media-unavailable" role="status">This media is currently unavailable.</p>;
  return video
    ? <video className={className} src={src} aria-label={alt} controls playsInline preload="metadata" onError={() => setFailedSource(src)} onEnded={onEnded} />
    : <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailedSource(src)} />;
}

export function SocialAvatar({ src, name, className = 'avatar social-author-avatar' }: { src?: string | null; name: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src
    ? <img className={className} src={src} alt={name} onError={() => setFailedSource(src)} />
    : <span className={className} aria-label={name}>{name.slice(0, 1) || 'S'}</span>;
}
