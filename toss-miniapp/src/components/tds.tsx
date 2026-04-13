import React from 'react';

// TDS Provider (Mock for Apps-in-Toss environment wrapper)
export function TDSProvider({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Tossface, "Pretendard", sans-serif', WebkitFontSmoothing: 'antialiased', color: '#191F28' }}>
      {children}
    </div>
  );
}

// TDS Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}
export function Button({ variant = 'primary', children, style, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px 24px',
    borderRadius: '16px',
    fontWeight: '700',
    fontSize: '17px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s ease',
  };

  const variants = {
    primary: { background: '#3182f6', color: '#ffffff' },
    secondary: { background: '#f2f4f6', color: '#4e5968' },
    danger: { background: '#e52528', color: '#ffffff' },
  };

  return (
    <button style={{ ...baseStyle, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

// TDS Bottom Sheet Modal component
export function BottomSheet({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', paddingBottom: '32px', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h3>
          <button style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#b0b8c1' }} onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// TDS Select component
export function Select({ value, onChange, options, placeholder = '선택해주세요' }: { value: string, onChange: (val: string) => void, options: { label: string, value: string }[], placeholder?: string }) {
  return (
    <select 
       value={value} 
       onChange={(e) => onChange(e.target.value)}
       style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px', backgroundColor: '#f9f9f9', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}

// TDS ListRow component
export function ListRow({ icon, title, subTitle, onClick }: { icon?: React.ReactNode, title: string, subTitle?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '16px 0', 
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: '1px solid #f2f4f6'
      }}
    >
      {icon && <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f2f4f6', color: '#3182f6' }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#191f28', marginBottom: '4px' }}>{title}</div>
        {subTitle && <div style={{ fontSize: '13px', color: '#8b95a1' }}>{subTitle}</div>}
      </div>
      {onClick && (
        <div style={{ color: '#b0b8c1' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// TDS TextField Component
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: error ? '2px solid #f04452' : '1px solid transparent',
          backgroundColor: '#f2f4f6',
          fontSize: '16px',
          color: '#191f28',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '2px solid #3182f6';
          e.currentTarget.style.backgroundColor = '#ffffff';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = error ? '2px solid #f04452' : '1px solid transparent';
          e.currentTarget.style.backgroundColor = '#f2f4f6';
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <p style={{ fontSize: '13px', color: '#f04452', marginTop: '6px' }}>{error}</p>
      )}
    </div>
  );
}

