'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Wraps children in a div that fades in from below when scrolled into view.
 * Falls back to fully visible if JS/IntersectionObserver is unavailable.
 */
export default function AnimatedSection({ children, style, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        filter: visible ? 'blur(0px)' : 'blur(4px)',
        transition: `opacity 0.8s ease-out ${delay}ms, transform 0.8s ease-out ${delay}ms, filter 0.8s ease-out ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
