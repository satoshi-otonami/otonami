import { DT as D } from '@/lib/design-tokens';

// Shared section typography for the landing page. Every section heading and
// the small label above it come from here, so sizes and letter-spacing stay
// the same from section to section.

// Two heading sizes only: LG for the main sections, SM for supporting ones
// (EPK perk, FAQ).
export const H2_LG = {
  fontFamily: D.fHead,
  fontSize: 'clamp(28px, 4.2vw, 40px)',
  fontWeight: 700,
  lineHeight: 1.3,
};

export const H2_SM = {
  fontFamily: D.fHead,
  fontSize: 'clamp(24px, 3.2vw, 30px)',
  fontWeight: 700,
  lineHeight: 1.3,
};

// Small label above a section heading. `tone` must match the section
// background: gold #8a5f31 on light sections, #d8a878 on dark ones.
export function Eyebrow({ children, tone = 'light', style }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: tone === 'dark' ? '#d8a878' : '#8a5f31',
      marginBottom: 14,
      ...style,
    }}>
      {children}
    </div>
  );
}
