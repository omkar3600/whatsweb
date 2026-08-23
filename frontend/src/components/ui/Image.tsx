export default function Image({ src, alt, className = '', style }: any) {
  // A simple fallback if no src is provided
  if (!src) return <div className={`bg-surface-200 flex items-center justify-center text-text-muted text-xs ${className}`} style={style}>Image Placeholder</div>;
  
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || 'Image'} className={className} style={style} />;
}
