import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import type { PermissionGroup, PermissionGroupMember } from '../../api/client';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToastStore } from '../../store/toast';
import { usePermissions } from '../../hooks/usePermissions';
import { useSSRPage } from '../../ssr/useSSRPage';
import { t } from '../../i18n';
import {
  Shield, Plus, Trash2, Users as UsersIcon, X, Search, Pencil, ChevronLeft, ChevronRight, Lock,
} from 'lucide-react';
import '../Admin.css';

const PERMISSION_KEYS = ['contest_admin', 'problem_admin', 'list_admin', 'ticket_admin', 'upload_admin'] as const;
const ALL_PERMS = [...PERMISSION_KEYS];

function permLabel(p: string): string {
  const map: Record<string, 'permissionGroups.perm_contest' | 'permissionGroups.perm_problem' | 'permissionGroups.perm_list' | 'permissionGroups.perm_ticket' | 'permissionGroups.perm_upload'> = {
    contest_admin: 'permissionGroups.perm_contest',
    problem_admin: 'permissionGroups.perm_problem',
    list_admin: 'permissionGroups.perm_list',
    ticket_admin: 'permissionGroups.perm_ticket',
    upload_admin: 'permissionGroups.perm_upload',
  };
  return map[p] ? t(map[p]) : p;
}

export default function AdminPermissionGroups() {
  useDocumentTitle(t('permissionGroups.title'));
  const addToast = useToastStore((s) => s.addToast);
  const perms = usePermissions();
  const ssr = useSSRPage<{ groups?: { groups?: PermissionGroup[] } }>('adminPermissionGroups');
  const firstRunRef = useRef(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const [groups, setGroups] = useState<PermissionGroup[]>(ssr?.groups?.groups ?? []);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);

  // ── 编辑/创建表单 ──
  const [editing, setEditing] = useState<PermissionGroup | 'new' | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [formSort, setFormSort] = useState(0);

  // ── 成员管理 ──
  const [members, setMembers] = useState<PermissionGroupMember[]>([]);
  const [memberPagination, setMemberPagination] = useState<any>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [addUserId, setAddUserId] = useState('');
  const [addUsername, setAddUsername] = useState('');

  const canManage = perms.isSuperAdmin;

  const fetchGroups = useCallback(async () => {
    try {
      const data = await api.getPermissionGroups();
      setGroups(data.groups);
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  }, [addToast]);

  const fetchMembers = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const data = await api.getPermissionGroupMembers(selectedGroup.id, {
        page: memberPage,
        pageSize: 20,
        search: debouncedMemberSearch || undefined,
      });
      setMembers(data.members);
      setMemberPagination(data.pagination);
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  }, [selectedGroup, memberPage, debouncedMemberSearch, addToast]);

  useEffect(() => {
    if (ssr?.groups?.groups && firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    firstRunRef.current = false;
    fetchGroups();
  }, [fetchGroups, refreshKey, ssr]);

  useEffect(() => {
    if (!selectedGroup) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-deps-change pattern
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
      setMemberPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [memberSearch]);

  // ── 处理函数 ──
  const openNew = () => {
    setEditing('new');
    setFormName('');
    setFormDesc('');
    setFormColor('');
    setFormPerms([]);
    setFormSort(0);
  };

  const openEdit = (g: PermissionGroup) => {
    setEditing(g);
    setFormName(g.name);
    setFormDesc(g.description || '');
    setFormColor(g.color || '');
    setFormPerms(g.permissions || []);
    setFormSort(g.sort_order || 0);
  };

  const closeForm = () => setEditing(null);

  const toggleFormPerm = (p: string) => {
    setFormPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const submitForm = async () => {
    if (!formName.trim()) { addToast('error', t('permissionGroups.nameRequired')); return; }
    try {
      if (editing === 'new') {
        await api.createPermissionGroup({
          name: formName.trim(),
          description: formDesc,
          permissions: formPerms,
          color: formColor,
          sort_order: formSort,
        });
        addToast('success', t('permissionGroups.created'));
      } else if (editing) {
        const patch: any = {
          name: formName.trim(),
          description: formDesc,
          color: formColor,
          sort_order: formSort,
        };
        // 内置组不允许改权限,仅传可改字段
        if (!editing.is_system) patch.permissions = formPerms;
        await api.updatePermissionGroup(editing.id, patch);
        addToast('success', t('permissionGroups.updated'));
      }
      closeForm();
      refresh();
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  };

  const handleDelete = async (g: PermissionGroup) => {
    if (g.is_system) { addToast('error', t('permissionGroups.systemNoDelete')); return; }
    if (!confirm(t('permissionGroups.deleteConfirm').replace('{name}', g.name))) return;
    try {
      await api.deletePermissionGroup(g.id);
      addToast('success', t('permissionGroups.deleted'));
      if (selectedGroup?.id === g.id) setSelectedGroup(null);
      refresh();
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  };

  const openMembers = (g: PermissionGroup) => {
    setSelectedGroup(g);
    setMemberPage(1);
    setMemberSearch('');
    setDebouncedMemberSearch('');
    setAddUserId('');
    setAddUsername('');
  };

  const closeMembers = () => {
    setSelectedGroup(null);
    setMembers([]);
    setMemberPagination(null);
  };

  const handleAddMember = async () => {
    if (!selectedGroup) return;
    if (!addUserId && !addUsername.trim()) { addToast('error', t('permissionGroups.userIdOrUsernameRequired')); return; }
    try {
      let uid = Number(addUserId);
      if (!uid && addUsername.trim()) {
        // 通过用户名查 ID:复用 search 接口或 users/list 搜索
        const res = await api.getUserList({ search: addUsername.trim(), pageSize: 1 });
        if (!res.users.length) { addToast('error', t('permissionGroups.userNotFound')); return; }
        uid = res.users[0].id;
      }
      await api.addPermissionGroupMember(selectedGroup.id, uid);
      addToast('success', t('permissionGroups.memberAdded'));
      setAddUserId('');
      setAddUsername('');
      fetchMembers();
      refresh();
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedGroup) return;
    try {
      await api.removePermissionGroupMember(selectedGroup.id, userId);
      addToast('success', t('permissionGroups.memberRemoved'));
      fetchMembers();
      refresh();
    } catch (e: any) {
      addToast('error', e.message || t('common.error'));
    }
  };

  return (
    <div className="admin-form">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            <Shield size={22} />
            {t('permissionGroups.title')}
          </h1>
          <span className="admin-page-subtitle">
            {t('permissionGroups.subtitle')}
          </span>
        </div>
        {canManage && !editing && (
          <div className="admin-page-header-actions">
            <button className="btn btn-primary btn-sm" onClick={openNew}>
              <Plus size={14} /> {t('permissionGroups.create')}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="admin-card" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--bg-elev)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{editing === 'new' ? t('permissionGroups.createTitle') : t('permissionGroups.editTitle').replace('{name}', editing.name)}</h3>
            <button className="btn btn-ghost btn-sm" onClick={closeForm}><X size={16} /></button>
          </div>
          <div className="form-group">
            <label className="form-label">{t('permissionGroups.name')} {editing !== 'new' && editing.is_system && <Lock size={12} style={{ display: 'inline' }} />}</label>
            <input
              className="form-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={editing !== 'new' && editing.is_system}
              placeholder={t('permissionGroups.namePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('permissionGroups.description')}</label>
            <input
              className="form-input"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t('permissionGroups.descriptionPlaceholder')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('permissionGroups.color')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={formColor || '#6b7280'}
                onChange={(e) => setFormColor(e.target.value)}
                style={{ width: 40, height: 32, padding: 0, border: 'none', background: 'none' }}
              />
              <input className="form-input" value={formColor} onChange={(e) => setFormColor(e.target.value)} placeholder="#ef4444" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              {t('permissionGroups.perms')} {editing !== 'new' && editing.is_system && <Lock size={12} style={{ display: 'inline' }} />}
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {ALL_PERMS.map((p) => (
                <label key={p} className="permission-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formPerms.includes(p)}
                    onChange={() => toggleFormPerm(p)}
                    disabled={editing !== 'new' && editing.is_system}
                  />
                  <span>{permLabel(p)} ({p})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('permissionGroups.sortOrder')}</label>
            <input
              className="form-input"
              type="number"
              value={formSort}
              onChange={(e) => setFormSort(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={submitForm}>{t('admin.save')}</button>
            <button className="btn btn-secondary btn-sm" onClick={closeForm}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="group-list">
        {groups.length === 0 && !ssr?.groups && <p style={{ color: 'var(--text-muted)' }}>{t('permissionGroups.loading')}</p>}
        {groups.map((g) => (
          <div key={g.id} className={`admin-card${selectedGroup?.id === g.id ? ' selected' : ''}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 10, background: 'var(--bg-elev)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    className="group-name"
                    style={{ fontWeight: 600, color: g.color || undefined, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {g.color && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: g.color }} />}
                    {g.name}
                  </span>
                  {g.is_system && <span className="perm-tag" style={{ background: 'rgba(99,102,241,.15)', color: '#6366f1' }}>{t('permissionGroups.systemBadge')}</span>}
                  <span className="perm-tag" style={{ background: 'rgba(100,116,139,.15)', color: '#64748b' }}>{t('permissionGroups.memberCount').replace('{count}', String(g.member_count ?? 0))}</span>
                </div>
                {g.description && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{g.description}</p>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {(g.permissions || []).length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('permissionGroups.noPerms')}</span>
                  ) : g.permissions.map((p) => (
                    <span key={p} className="perm-tag">{permLabel(p)}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openMembers(g)} title={t('permissionGroups.manageMembers')}>
                  <UsersIcon size={14} /> {t('permissionGroups.members')}
                </button>
                {canManage && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(g)} title={t('permissionGroups.edit')}><Pencil size={14} /></button>
                    {!g.is_system && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g)} title={t('permissionGroups.delete')}><Trash2 size={14} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <div className="admin-card" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 16, background: 'var(--bg-elev)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t('permissionGroups.groupMembersTitle').replace('{name}', selectedGroup.name)}</h3>
            <button className="btn btn-ghost btn-sm" onClick={closeMembers}><X size={16} /></button>
          </div>

          {canManage ? (
            <div className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ width: 140 }}
                type="number"
                placeholder={t('permissionGroups.userIdPlaceholder')}
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
              />
              <span style={{ color: 'var(--text-muted)' }}>{t('permissionGroups.or')}</span>
              <input
                className="form-input"
                style={{ width: 180 }}
                placeholder={t('permissionGroups.usernamePlaceholder')}
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddMember}><Plus size={14} /> {t('permissionGroups.add')}</button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('permissionGroups.viewOnlyHint')}</p>
          )}

          <div className="user-search" style={{ marginBottom: 12 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder={t('permissionGroups.searchMembersPlaceholder')}
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>

          <div className="user-list">
            {members.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('permissionGroups.noMembers')}</p>}
            {members.map((m) => (
              <div key={m.id} className={`user-item${m.banned ? ' user-banned' : ''}`}>
                <div className="user-info">
                  <span className="user-name">{m.username}{!!m.banned && <span className="user-banned-badge">{t('permissionGroups.banned')}</span>}</span>
                  <span className="user-role-badge" style={{ color: m.role === 'admin' ? '#ef4444' : '#3b82f6' }}>#{m.id} · {m.role}</span>
                </div>
                <div className="user-actions">
                  {canManage && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>
                      <Trash2 size={14} /> {t('permissionGroups.remove')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {memberPagination && memberPagination.totalPages > 1 && (
            <div className="pm-pagination">
              <button className="btn btn-secondary btn-sm" disabled={memberPage <= 1} onClick={() => setMemberPage(memberPage - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span className="pm-page-info">{memberPagination.page} / {memberPagination.totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={memberPage >= memberPagination.totalPages} onClick={() => setMemberPage(memberPage + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
