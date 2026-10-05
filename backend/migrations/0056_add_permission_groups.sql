-- 权限组(permission_groups)
--  - permission_groups:一组权限的命名集合(如「比赛管理员组」打包 contest_admin)
--  - user_permission_groups:用户与组的多对多关系
-- 最终权限 = 个人 users.permissions ∪ 所在组的 permissions
-- (与 users.permissions 并存,见 H5 设计文档)

CREATE TABLE IF NOT EXISTS permission_groups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  permissions  TEXT DEFAULT '[]',   -- JSON array of permission strings
  is_system    INTEGER DEFAULT 0,    -- 1=内置组(不可删除/不可改名,但可改成员)
  color        TEXT DEFAULT '',      -- 前端展示用可选颜色
  sort_order   INTEGER DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_permission_groups (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id   INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_groups_user ON user_permission_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_group ON user_permission_groups(group_id);

-- 内置默认组(is_system=1)。每条对应一种粒度的管理员能力。
-- 注意:不创建「超级管理员组」,超级管理员仍由 users.id=1 / role='super_admin' 决定,
-- 以保持单点特权提升的边界。
INSERT INTO permission_groups (name, description, permissions, is_system, color, sort_order) VALUES
  ('比赛管理员', '管理比赛、抄袭检测', '["contest_admin"]', 1, '#ef4444', 1),
  ('题目管理员', '管理题目、标签、题解审核、举报', '["problem_admin"]', 1, '#f59e0b', 2),
  ('题单管理员', '管理题单、训练', '["list_admin"]', 1, '#10b981', 3),
  ('工单管理员', '处理用户工单', '["ticket_admin"]', 1, '#3b82f6', 4),
  ('上传管理员', '管理上传文件', '["upload_admin"]', 1, '#8b5cf6', 5),
  ('全站管理员', '拥有全部细粒度权限(不含超级管理员特权)', '["contest_admin","problem_admin","list_admin","ticket_admin","upload_admin"]', 1, '#0ea5e9', 6);
