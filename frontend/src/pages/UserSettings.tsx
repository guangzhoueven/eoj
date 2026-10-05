import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { t } from '../i18n';
import { useSSRPage } from '../ssr/useSSRPage';
import { Save, Settings, Bell, Code2, Palette, Check, RotateCcw } from 'lucide-react';
import {
  applyUserTheme,
  ACCENT_PRESETS, RADIUS_PRESET_LIST, FONT_PRESET_LIST,
} from '../utils/theme';

// SSR 注入数据(对应 backend/src/loaders.ts 中 userSettingsPage loader 的返回:未登录时返回 {})
interface UserSettingsSSRData {
  settings?: { settings?: Record<string, string> };
}

export default function UserSettings() {
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  useDocumentTitle(t('userSettings.pageTitle'));
  const ssr = useSSRPage<UserSettingsSSRData>('userSettingsPage');
  const firstRunRef = useRef<boolean>(true);
  const [settings, setSettings] = useState<Record<string, string>>(ssr?.settings?.settings ?? {});
  const [saving, setSaving] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedLang, setSelectedLang] = useState('python');
  const [templateContent, setTemplateContent] = useState('');

  // 主题外观:从 settings 中拆出独立 state,任何改动即时应用到 DOM 预览,
  // 但仅在用户点击"保存设置"时持久化到后端。
  const [themeAccent, setThemeAccent] = useState<string>(settings.theme_accent || '');
  const [themeRadius, setThemeRadius] = useState<string>(settings.theme_radius || '');
  const [themeFont, setThemeFont] = useState<string>(settings.theme_font || '');

  // 主题预览:任一项变化立即应用(纯客户端预览,不持久化)
  useEffect(() => {
    applyUserTheme({ accent: themeAccent, radius: themeRadius, font: themeFont });
  }, [themeAccent, themeRadius, themeFont]);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data.templates || []);
      // Set initial content for selected language
      const tpl = data.templates?.find((t: any) => t.language === selectedLang);
      setTemplateContent(tpl?.content || '');
    } catch {
      // ignore
    }
  }, [selectedLang]);

  const fetchNotifyPrefs = useCallback(async () => {
    try {
      const data = await api.getNotificationPreferences();
      setNotifyPrefs(data.preferences || {});
    } catch {
      // ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getUserSettings();
      setSettings(data.settings || {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // SSR 已注入数据则跳过首次拉取(避免重复请求与首屏闪烁)。
    // 仅 settings 由 SSR 提供;通知偏好与模板仍需拉取。
    if (ssr && firstRunRef.current) {
      firstRunRef.current = false;
    } else {
      /* eslint-disable react-hooks/set-state-in-effect */
      fetchSettings();
    }
    fetchNotifyPrefs();
    fetchTemplates();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchSettings, fetchNotifyPrefs, fetchTemplates, ssr]);

  const handleSaveTemplate = async () => {
    try {
      await api.saveTemplate(selectedLang, templateContent, `${selectedLang} template`);
      addToast('success', t('userSettings.templateSaved'));
      fetchTemplates();
    } catch (e: any) {
      addToast('error', e.message || t('userSettings.saveFailed'));
    }
  };

  const handleLangChange = (lang: string) => {
    setSelectedLang(lang);
    const tpl = templates.find((t: any) => t.language === lang);
    setTemplateContent(tpl?.content || '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        ...settings,
        // 合并主题外观字段到 settings,一次性 PUT 到后端
        theme_accent: themeAccent,
        theme_radius: themeRadius,
        theme_font: themeFont,
      };
      await api.saveUserSettings(payload);
      setSettings(payload);
      addToast('success', t('userSettings.saved'));
    } catch (e: any) {
      addToast('error', e.message || t('userSettings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = () => {
    // 清空三项 = 回退到站点 / CSS 默认主题
    setThemeAccent('');
    setThemeRadius('');
    setThemeFont('');
    addToast('info', t('theme.resetDone'));
  };

  if (!user) {
    return <div className="empty-state"><p>{t('userSettings.pleaseLogin')}</p></div>;
  }

  return (
    <div className="settings-page" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Settings size={24} />
        {t('userSettings.pageTitle')}
      </h1>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Palette size={18} /> {t('theme.appearance')}
          </h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={resetTheme}
            title={t('theme.resetTitle')}
          >
            <RotateCcw size={13} /> {t('theme.reset')}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -8, marginBottom: 16 }}>
          {t('theme.hint')}
        </p>

        {/* ── 强调色 ── */}
        <div className="form-group">
          <label>{t('theme.accent')}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {ACCENT_PRESETS.map((p) => {
              const selected = themeAccent.toLowerCase() === p.value.toLowerCase();
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setThemeAccent(selected ? '' : p.value)}
                  title={p.name}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius)',
                    border: selected ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                    background: p.value,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    padding: 0,
                    transition: 'transform var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {selected && <Check size={14} />}
                </button>
              );
            })}
            {/* 自定义颜色拾色器 */}
            <label
              title={t('theme.customColor')}
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius)',
                border: themeAccent && !ACCENT_PRESETS.some(p => p.value.toLowerCase() === themeAccent.toLowerCase()) ? '2px solid var(--text-primary)' : '1px dashed var(--border)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: themeAccent && !ACCENT_PRESETS.some(p => p.value.toLowerCase() === themeAccent.toLowerCase()) ? themeAccent : 'transparent',
                overflow: 'hidden', padding: 0, position: 'relative',
              }}
            >
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(themeAccent) ? themeAccent : '#58a6ff'}
                onChange={(e) => setThemeAccent(e.target.value)}
                style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', cursor: 'pointer', opacity: 0 }}
              />
              {!themeAccent && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>+</span>}
              {themeAccent && !ACCENT_PRESETS.some(p => p.value.toLowerCase() === themeAccent.toLowerCase()) && <Check size={14} color="#fff" />}
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            {t('theme.accentHint')}
          </p>
        </div>

        {/* ── 圆角 ── */}
        <div className="form-group">
          <label>{t('theme.radius')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {RADIUS_PRESET_LIST.map((p) => {
              const selected = themeRadius === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setThemeRadius(selected ? '' : p.key)}
                  className={`btn ${selected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{
                    borderRadius: p.key === 'sharp' ? 0 : p.key === 'normal' ? 6 : 12,
                    flex: 1,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 字体 ── */}
        <div className="form-group">
          <label>{t('theme.font')}</label>
          <select
            className="form-input form-select"
            value={themeFont || ''}
            onChange={(e) => setThemeFont(e.target.value)}
          >
            <option value="">{t('theme.fontFollowTheme')}</option>
            {FONT_PRESET_LIST.map((p) => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Code2 size={18} /> {t('userSettings.editorPrefs')}
        </h3>

        <div className="form-group">
          <label>{t('userSettings.editorTheme')}</label>
          <select
            className="form-input form-select"
            value={settings.editor_theme || 'dark'}
            onChange={(e) => setSettings({ ...settings, editor_theme: e.target.value })}
          >
            <option value="dark">{t('userSettings.editorThemeDark')}</option>
            <option value="light">{t('userSettings.editorThemeLight')}</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t('userSettings.editorFontSize')}</label>
          <select
            className="form-input form-select"
            value={settings.editor_font_size || '14'}
            onChange={(e) => setSettings({ ...settings, editor_font_size: e.target.value })}
          >
            <option value="12">12px</option>
            <option value="13">13px</option>
            <option value="14">14px</option>
            <option value="15">15px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
          </select>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('userSettings.editorFontSizeHint')}</p>
        </div>

        <div className="form-group">
          <label>{t('userSettings.customCss')}</label>
          <textarea
            className="form-input"
            rows={6}
            value={settings.custom_css || ''}
            onChange={(e) => setSettings({ ...settings, custom_css: e.target.value })}
            placeholder={t('userSettings.customCssPlaceholder')}
            spellCheck={false}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('userSettings.customCssHint')}</p>
        </div>

        <div className="form-group">
          <label>{t('userSettings.defaultLanguage')}</label>
          <select
            className="form-input form-select"
            value={settings.default_language || 'python'}
            onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t('userSettings.title')}</label>
          <input
            type="text"
            className="form-input"
            value={settings.title || ''}
            onChange={(e) => setSettings({ ...settings, title: e.target.value.slice(0, 30) })}
            placeholder={t('userSettings.titlePlaceholder')}
            maxLength={30}
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('userSettings.titleHint')}</p>
        </div>

        <div className="form-group">
          <label>{t('userSettings.pageSize')}</label>
          <select
            className="form-input form-select"
            value={settings.page_size || '20'}
            onChange={(e) => setSettings({ ...settings, page_size: e.target.value })}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? t('userSettings.saving') : t('userSettings.save')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={18} /> {t('userSettings.notifyPrefs')}
        </h3>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notifyPrefs.notify_contest !== 'false'}
              onChange={(e) => setNotifyPrefs({ ...notifyPrefs, notify_contest: e.target.checked ? 'true' : 'false' })}
            />
            <span>{t('userSettings.notifyContest')}</span>
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notifyPrefs.notify_message !== 'false'}
              onChange={(e) => setNotifyPrefs({ ...notifyPrefs, notify_message: e.target.checked ? 'true' : 'false' })}
            />
            <span>{t('userSettings.notifyMessage')}</span>
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notifyPrefs.notify_follow !== 'false'}
              onChange={(e) => setNotifyPrefs({ ...notifyPrefs, notify_follow: e.target.checked ? 'true' : 'false' })}
            />
            <span>{t('userSettings.notifyFollow')}</span>
          </label>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" onClick={async () => {
            try {
              await api.saveNotificationPreferences(notifyPrefs);
              addToast('success', t('userSettings.notifyPrefsSaved'));
            } catch (e: any) {
              addToast('error', e.message || t('userSettings.saveFailed'));
            }
          }}>
            <Save size={14} /> {t('userSettings.notifyPrefsSave')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Code2 size={18} /> {t('userSettings.codeTemplates')}
        </h3>
        <div className="form-group">
          <label>{t('userSettings.selectLanguage')}</label>
          <select className="form-input form-select" value={selectedLang} onChange={(e) => handleLangChange(e.target.value)}>
            <option value="python">Python 3</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="c">C</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
        <div className="form-group">
          <label>{t('userSettings.templateContent')}</label>
          <textarea
            className="form-input"
            rows={12}
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSaveTemplate}>
            <Save size={14} /> {t('templates.save')}
          </button>
        </div>
      </div>
    </div>
  );
}