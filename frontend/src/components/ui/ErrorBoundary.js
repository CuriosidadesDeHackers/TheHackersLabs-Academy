import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--txt-3)' }}>
          <p style={{ fontSize: 15, color: 'var(--txt-2)', marginBottom: 12 }}>Algo salió mal.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ padding: '8px 16px', background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 'var(--r2)', cursor: 'pointer', fontWeight: 700 }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
