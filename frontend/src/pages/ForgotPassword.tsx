import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { t } from '../i18n';
import './Login.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t('passwordReset.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message || t('passwordReset.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <CheckCircle size={48} className="login-success-icon" />
            <h1>{t('passwordReset.sentTitle')}</h1>
          </div>
          <p className="login-description">
            {t('passwordReset.sentHint')}
            <br />
            {t('passwordReset.linkExpiry')}
          </p>
          <div className="login-actions" style={{ marginTop: 20 }}>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ArrowLeft size={16} />
              {t('passwordReset.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Mail size={32} />
          <h1>{t('passwordReset.forgotTitle')}</h1>
        </div>
        <p className="login-description">{t('passwordReset.forgotHint')}</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>{t('passwordReset.emailLabel')}</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Mail size={16} />}
            {loading ? t('passwordReset.sending') : t('passwordReset.send')}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" className="login-footer-link">
            <ArrowLeft size={14} />
            {t('passwordReset.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
