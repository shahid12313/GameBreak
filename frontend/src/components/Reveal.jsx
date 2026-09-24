import { useEffect, useRef, useState } from 'react';

/* Fades/slides its children in the first time they scroll into view.
   `delay` (ms) staggers siblings; reduced-motion users get no animation
   via the CSS in site.css. */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal${shown ? ' in' : ''} ${className}`} style={{ ...style, '--d': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
