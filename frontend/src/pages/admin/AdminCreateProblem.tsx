import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useToastStore } from '../../store/toast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { DIFFICULTIES } from '../../constants';
import { t } from '../../i18n';
import { Save, Code2, FileText, Gauge, Cpu, Tag, Eye } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import ClientOnly from '../../components/ClientOnly';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useThemeStore } from '../../store/theme';
import '../Admin.css';

const getLangExtension = (lang: string) => {
  switch (lang) {
    case 'python': return python();
    case 'cpp': case 'c': return cpp();
    case 'java': return java();
    case 'javascript': return javascript();
    default: return python();
  }
};

export default function AdminCreateProblem() {
  useDocumentTitle(t('admin.createProblem'));
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const [saving, setSaving] = useState(false);
  const [problemForm, setProblemForm] = useState({
    title: '',
    slug: '',
    description: '',
    input_format: '',
    output_format: '',
    time_limit: 1000,
    memory_limit: 256,
    tags: [] as string[],
    difficulty: 'Easy',
    is_public: true,
    judge_type: 'default' as 'default' | 'spj',
    spj_language: 'cpp' as string,
  });

  const [spjCode, setSpjCode] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !problemForm.tags.includes(tagInput.trim())) {
      setProblemForm({ ...problemForm, tags: [...problemForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setProblemForm({ ...problemForm, tags: problemForm.tags.filter((t) => t !== tag) });
  };

  const handleCreateProblem = async () => {
    if (!problemForm.title || !problemForm.description) {
      addToast('error', t('admin.titleRequired'));
      return;
    }
    setSaving(true);
    try {
      const data: any = { ...problemForm };
      data.slug = data.slug.trim();
      if (problemForm.judge_type === 'spj') {
        data.spj_code = spjCode;
      }
      const result = await api.createProblem(data);
      const problemSlug = data.slug || result.slug || '';
      addToast('success', t('admin.problemCreated'));
      navigate(`/admin/testcases?problemId=${result.id}&problemTitle=${encodeURIComponent(problemForm.title)}&problemSlug=${encodeURIComponent(problemSlug)}&problemDifficulty=${problemForm.difficulty}&problemJudgeType=${problemForm.judge_type}`);
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-form form-sectioned">
      {/* ── 页面头部 ── */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            <FileText size={22} />
            {t('admin.createProblem')}
          </h1>
          <span className="admin-page-subtitle">
            填写题目基本信息、时空限制与评测方式。创建完成后将跳转到测试数据管理页。
          </span>
        </div>
      </div>

      {/* ── Section 1: 基本信息 ── */}
      <section className="form-section">
        <header className="form-section-header">
          <span className="form-section-icon"><FileText size={16} /></span>
          <span className="form-section-titles">
            <span className="form-section-title">基本信息</span>
            <span className="form-section-desc">题目标题、标识符与题目描述</span>
          </span>
        </header>
        <div className="form-section-body">
          <div className="form-group">
            <label>{t('admin.problemTitle')}</label>
            <input
              type="text"
              value={problemForm.title}
              onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
              placeholder={t('admin.problemTitlePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.slug')}</label>
            <input
              type="text"
              value={problemForm.slug}
              onChange={(e) => setProblemForm({ ...problemForm, slug: e.target.value })}
              placeholder={t('admin.slugPlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.description')}</label>
            <textarea
              rows={8}
              value={problemForm.description}
              onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
              placeholder={t('admin.descriptionPlaceholder')}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('admin.inputFormat')}</label>
              <textarea
                rows={3}
                value={problemForm.input_format}
                onChange={(e) => setProblemForm({ ...problemForm, input_format: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('admin.outputFormat')}</label>
              <textarea
                rows={3}
                value={problemForm.output_format}
                onChange={(e) => setProblemForm({ ...problemForm, output_format: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: 时空限制 & 难度 ── */}
      <section className="form-section">
        <header className="form-section-header">
          <span className="form-section-icon"><Gauge size={16} /></span>
          <span className="form-section-titles">
            <span className="form-section-title">时空限制与难度</span>
            <span className="form-section-desc">控制评测的资源边界与题目难度等级</span>
          </span>
        </header>
        <div className="form-section-body">
          <div className="form-row">
            <div className="form-group">
              <label>{t('admin.timeLimit')}</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={problemForm.time_limit}
                  onChange={(e) => setProblemForm({ ...problemForm, time_limit: parseInt(e.target.value) })}
                />
                <span className="input-suffix">ms</span>
              </div>
            </div>
            <div className="form-group">
              <label>{t('admin.memoryLimit')}</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  value={problemForm.memory_limit}
                  onChange={(e) => setProblemForm({ ...problemForm, memory_limit: parseInt(e.target.value) })}
                />
                <span className="input-suffix">MB</span>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>{t('admin.difficulty')}</label>
            <select
              value={problemForm.difficulty || 'Easy'}
              onChange={(e) => setProblemForm({ ...problemForm, difficulty: e.target.value })}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Section 3: 评测类型 ── */}
      <section className="form-section">
        <header className="form-section-header">
          <span className="form-section-icon"><Cpu size={16} /></span>
          <span className="form-section-titles">
            <span className="form-section-title">评测类型</span>
            <span className="form-section-desc">默认比对 或 Special Judge 自定义校验</span>
          </span>
        </header>
        <div className="form-section-body">
          <div className="form-group">
            <label>{t('admin.judgeType')}</label>
            <select
              value={problemForm.judge_type}
              onChange={(e) => setProblemForm({ ...problemForm, judge_type: e.target.value as 'default' | 'spj' })}
            >
              <option value="default">{t('admin.defaultJudge')}</option>
              <option value="spj">{t('admin.specialJudge')}</option>
            </select>
          </div>
          {problemForm.judge_type === 'spj' && (
            <>
              <div className="form-group">
                <label>{t('admin.spjLanguage')}</label>
                <select
                  value={problemForm.spj_language}
                  onChange={(e) => setProblemForm({ ...problemForm, spj_language: e.target.value })}
                >
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>
              <div className="form-group">
                <label><Code2 size={16} /> {t('admin.spjCode')}</label>
                <div className="spj-code-editor">
                  <ClientOnly>
                    <CodeMirror
                      value={spjCode}
                      onChange={(val) => setSpjCode(val)}
                      height="300px"
                      theme={theme === 'dark' ? oneDark : undefined}
                      extensions={[getLangExtension(problemForm.spj_language)]}
                      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
                    />
                  </ClientOnly>
                </div>
                <small className="spj-hint">
                  {t('admin.spjHint')}
                </small>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Section 4: 标签与可见性 ── */}
      <section className="form-section">
        <header className="form-section-header">
          <span className="form-section-icon"><Tag size={16} /></span>
          <span className="form-section-titles">
            <span className="form-section-title">标签与可见性</span>
            <span className="form-section-desc">为题目归类,并控制是否对用户开放</span>
          </span>
        </header>
        <div className="form-section-body">
          <div className="form-group">
            <label>{t('admin.tags')}</label>
            <div className="tag-input-row">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder={t('admin.tagPlaceholder')}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddTag}>{t('common.add')}</button>
            </div>
            <div className="tag-list">
              {problemForm.tags.map((tag) => (
                <span key={tag} className="tag-chip active" onClick={() => handleRemoveTag(tag)}>
                  {tag} ×
                </span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={problemForm.is_public}
                onChange={(e) => setProblemForm({ ...problemForm, is_public: e.target.checked })}
              />
              <Eye size={14} style={{ color: 'var(--text-secondary)' }} />
              {t('admin.public')}
            </label>
          </div>
        </div>
      </section>

      {/* ── 提交按钮 ── */}
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button
          className="btn btn-primary"
          onClick={handleCreateProblem}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? t('admin.creating') : t('admin.createProblemButton')}
        </button>
      </div>
    </div>
  );
}
