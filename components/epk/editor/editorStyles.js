// Shared styles + a tiny labelled-field wrapper for the EPK editor tabs.
export const GOLD = '#c4956a';
export const CORAL = '#FF6B4A';
export const PAPER = '#f7f3ec';
export const INK = '#1a1a1a';

export const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: '#6b6560',
  marginBottom: 6,
  textTransform: 'uppercase',
};

export const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 8,
  border: '1px solid #ddd5c8',
  fontSize: 14,
  fontFamily: 'DM Sans, sans-serif',
  background: '#fff',
  color: INK,
  boxSizing: 'border-box',
};

export const cardStyle = {
  background: '#fff',
  border: '1px solid #ece4d6',
  borderRadius: 14,
  padding: 24,
  marginBottom: 20,
};

export const h3Style = {
  fontFamily: 'Sora, sans-serif',
  fontSize: 16,
  fontWeight: 700,
  color: INK,
  margin: '0 0 16px',
};

export const subtleBtn = {
  padding: '8px 14px',
  borderRadius: 100,
  border: '1px solid #ddd5c8',
  background: '#fff',
  color: INK,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

export const primaryBtn = {
  padding: '10px 20px',
  borderRadius: 100,
  border: 'none',
  background: CORAL,
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

export const hintStyle = { fontSize: 13, color: '#6b6560', marginBottom: 16 };

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
