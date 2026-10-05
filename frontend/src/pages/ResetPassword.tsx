import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Lock, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { t } from '../i18n';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <AlertCircle size={32} />
            <h1>{t('passwordReset.invalidToken')}</h1>
          </div>
          <p className="login-description">{t('passwordReset.invalidHint')}</p>
          <div className="login-actions" style={{ marginTop: 20 }}>
            <Link to="/forgot-password" className="btn btn-primary">
              {t('passwordReset.reapply')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('passwordReset.tooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordReset.mismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (e: any) {
      setError(e.message || t('passwordReset.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <CheckCircle size={48} className="login-success-icon" />
            <h1>{t('passwordReset.doneTitle')}</h1>
          </div>
          <p className="login-description">{t('passwordReset.doneHint')}</p>
          <div className="login-actions" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              {t('passwordReset.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Lock size={32} />
          <h1>{t('passwordReset.newPwdTitle')}</h1>
        </div>
        <p className="login-description">{t('passwordReset.newPwdHint')}</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>{t('passwordReset.pwdLabel')}</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordReset.pwdPlaceholder')}
              required
              minLength={8}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t('passwordReset.confirmPwdLabel')}</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('passwordReset.confirmPwdPlaceholder')}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            {loading ? t('passwordReset.submitting') : t('passwordReset.submit')}
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
