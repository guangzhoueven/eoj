import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useToastStore } from '../store/toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Code2, Trash2, Save, Edit3 } from 'lucide-react';
import { useSSRPage } from '../ssr/useSSRPage';
import { t } from '../i18n';
import '../pages/Admin.css';

const LANGUAGES = [
  { value: 'python', label: 'Python 3' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

// SSR 注入数据(对应 backend/src/loaders.ts 中 templates loader 的返回:未登录时返回 {})
interface TemplatesSSRData {
  templates?: { templates?: any[] };
}

export default function Templates() {
  useDocumentTitle(t('templates.title'));
  const addToast = useToastStore((s) => s.addToast);
  const ssr = useSSRPage<TemplatesSSRData>('templates');
  const firstRunRef = useRef<boolean>(true);
  const [templates, setTemplates] = useState<any[]>(ssr?.templates?.templates ?? []);
  const [loading, setLoading] = useState(!ssr);
  const [editLang, setEditLang] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(data.templates || []);
    } catch { setTemplates([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // SSR 已注入数据则跳过首次拉取(避免重复请求与首屏闪烁)
    if (ssr && firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    firstRunRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTemplates();
  }, [fetchTemplates, ssr]);

  const handleSave = async () => {
    if (!editLang || !editContent) return;
    try {
      await api.saveTemplate(editLang, editContent, editName);
      addToast('success', t('templates.saved'));
      setEditLang(''); setEditContent(''); setEditName('');
      fetchTemplates();
    } catch (e: any) { addToast('error', e.message || t('templates.saveFailed')); }
  };

  const handleDelete = async (lang: string) => {
    if (!confirm(t('templates.deleteConfirm'))) return;
    try {
      await api.deleteTemplate(lang);
      addToast('success', t('templates.deleted'));
      fetchTemplates();
    } catch (e: any) { addToast('error', e.message || t('templates.deleteFailed')); }
  };

  const startEdit = async (lang: string) => {
    try {
      const data = await api.getTemplate(lang);
      if (data.template) {
        setEditLang(lang);
        setEditContent(data.template.content || '');
        setEditName(data.template.name || '');
      }
    } catch { addToast('error', t('templates.fetchFailed')); }
  };

  return (
    <div className="admin-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Code2 size={24} /> {t('templates.title')}
      </h1>

      <div className="admin-form" style={{ marginTop: 20 }}>
        <div className="form-group">
          <label>{t('templates.languageLabel')}</label>
          <select value={editLang} onChange={(e) => { setEditLang(e.target.value); if (e.target.value) startEdit(e.target.value); }}>
            <option value="">{t('templates.languagePlaceholder')}</option>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        {editLang && (
          <>
            <div className="form-group">
              <label>{t('templates.nameLabel')}</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('templates.namePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('templates.contentLabel')}</label>
              <textarea rows={15} value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={!editContent.trim()}>
              <Save size={14} /> {t('templates.save')}
            </button>
          </>
        )}
      </div>

      <h3 style={{ marginTop: 30, marginBottom: 12 }}>{t('templates.savedTitle')}</h3>
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : templates.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('templates.empty')}</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>{t('templates.columnLanguage')}</th><th>{t('templates.columnName')}</th><th>{t('templates.columnUpdatedAt')}</th><th>{t('templates.columnActions')}</th></tr>
            </thead>
            <tbody>
              {templates.map((tpl: any) => (
                <tr key={tpl.language}>
                  <td><span className="tag-chip">{tpl.language}</span></td>
                  <td>{tpl.name || '-'}</td>
                  <td className="cell-value">{tpl.updated_at ? new Date(tpl.updated_at + 'Z').toLocaleString() : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(tpl.language)}>
                        <Edit3 size={12} /> {t('templates.edit')}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl.language)}>
                        <Trash2 size={12} /> {t('templates.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
