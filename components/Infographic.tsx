import React from 'react';

export default function Infographic() {
  const steps = [
    {
      id: 1,
      title: "Upload",
      iconColor: "var(--primary)",
      icon: (
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      desc: "Drag & drop images"
    },
    {
      id: 2,
      title: "Configure",
      iconColor: "#c084fc",
      icon: (
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
      desc: "Set time & effects"
    },
    {
      id: 3,
      title: "Render",
      iconColor: "#10b981",
      icon: (
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      desc: "Download MP4"
    }
  ];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto 3rem auto',
    position: 'relative',
    padding: '0 1rem',
  };

  const stepStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    zIndex: 10,
    position: 'relative',
  };

  const iconBoxStyle = (color: string): React.CSSProperties => ({
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'var(--bg-panel)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    color: color,
    boxShadow: `0 0 20px ${color}33`, // 33 = 20% opacity
    backdropFilter: 'blur(10px)',
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={containerStyle}>
        {/* Connector Line */}
        <div style={{
          position: 'absolute',
          top: '32px',
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
          zIndex: 0
        }}></div>

        {steps.map((step) => (
          <div key={step.id} style={stepStyle}>
             <div style={iconBoxStyle(step.iconColor)}>
                {step.icon}
             </div>
             <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{step.title}</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
