import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/ui/Spinner';

export default function CertificateVerify() {
  const { certId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/classroom/certificates/verify/${certId}/`)
      .then(r => setResult(r.data))
      .catch(() => setResult({ valid: false }))
      .finally(() => setLoading(false));
  }, [certId]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', padding: 20 }}>
      <div style={{ maxWidth: 440, width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r4)', padding: 36, textAlign: 'center' }}>
        <Link to="/about" style={{ fontSize: 13, color: 'var(--txt-3)', textDecoration: 'none' }}>← Volver</Link>
        <div style={{ marginTop: 18 }}>
          {loading ? (
            <Spinner />
          ) : result?.valid ? (
            <>
              <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4 }}>Certificado válido</h2>
              <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 22 }}>Verificado en The Hackers Labs</p>

              <div style={{ textAlign: 'left', background: 'var(--bg-3)', borderRadius: 'var(--r3)', padding: '18px 20px', display: 'grid', gap: 12 }}>
                <Field label="Alumno" value={result.student_name} />
                <Field label="Curso" value={result.course_title} />
                <Field label="Fecha de emisión" value={new Date(result.issued_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <Field label="ID de certificado" value={`THL-${result.cert_id}`} mono />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 44, marginBottom: 10 }}>❌</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-1)', marginBottom: 4 }}>Certificado no encontrado</h2>
              <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>El código no corresponde a ningún certificado emitido.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--txt-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, color: 'var(--txt-1)', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  );
}
