import type { ReactNode } from 'react';
import { AppIcon, type AppIconName } from '../../components/icons/AppIcon';
import { formatAdminTime } from '../../services/admin.api';

export const adminRoleNames: Record<string, string> = {
  SYSTEM_ADMIN: '平台管理员',
  PLATFORM_ADMIN: '平台管理员',
  MERCHANT_OWNER: '门店主账号',
  MERCHANT_ADMIN: '门店管理员',
  STAFF: '普通用户',
  TRIAL: '体验账号',
};

export const adminStatusNames: Record<string, string> = {
  ACTIVE: '启用',
  DISABLED: '禁用',
  DELETED: '已删除',
  PENDING: '待处理',
  PROCESSING: '处理中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  RESOLVED: '已解决',
  SUCCEEDED: '已完成',
  SUCCESS: '已完成',
  FAILED: '失败',
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  EXPIRED: '已过期',
};

export const adminFeatureNames: Record<string, string> = {
  remove_bg: '背景净化',
  replace_bg: '场景融合',
  enhance: '摄影增强',
  material: '材质替换',
  multiview: '多角度视图',
  lineart: '线稿图',
  promo_main_image: '产品主图',
  promo_poster_image: '广告海报图',
  promo_detail_image: '产品细节图',
  video_generate: '宣传视频生成',
};

export const adminResourceTypeNames: Record<string, string> = {
  material: '材质',
  scene: '场景',
  background: '背景',
  reference: '参考图',
  watermark: '水印',
  other: '其他',
};

export function featureName(value: unknown) {
  const key = String(value || '');
  return adminFeatureNames[key] || key || 'AI 任务';
}

export function statusName(value: unknown) {
  const key = String(value || '').toUpperCase();
  return adminStatusNames[key] || String(value || '-');
}

function statusTone(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (['ACTIVE', 'APPROVED', 'RESOLVED', 'SUCCEEDED', 'SUCCESS', 'PUBLISHED'].includes(status)) return 'success';
  if (['PENDING', 'PROCESSING', 'DRAFT'].includes(status)) return 'warning';
  if (['DISABLED', 'REJECTED', 'FAILED', 'DELETED', 'EXPIRED'].includes(status)) return 'danger';
  return 'neutral';
}

export function AdminStatusBadge({ value }: { value: unknown }) {
  return <span className={`adminStatusBadge is-${statusTone(value)}`}>{statusName(value)}</span>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  metric,
  metricLabel,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  metric?: ReactNode;
  metricLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="adminPageHeader">
      <div className="adminPageHeading">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(metric !== undefined || actions) && (
        <div className="adminPageHeaderSide">
          {metric !== undefined && <div className="adminHeaderMetric"><b>{metric}</b><span>{metricLabel}</span></div>}
          {actions && <div className="adminHeaderActions">{actions}</div>}
        </div>
      )}
    </header>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  className = '',
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`adminPanel ${className}`.trim()}>
      {(title || actions) && (
        <header className="adminPanelHeader">
          <div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>
          {actions && <div className="adminPanelActions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function AdminButton({
  icon,
  tone = 'default',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: AppIconName;
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
}) {
  return <button className={`adminButton is-${tone} ${className}`.trim()} type="button" {...props}>{icon && <AppIcon name={icon} />}{children}</button>;
}

export function AdminEmpty({ loading, error, text = '暂无数据' }: { loading?: boolean; error?: string; text?: string }) {
  return <div className={`adminEmpty ${error ? 'isError' : ''}`.trim()}>{loading ? '正在加载...' : error || text}</div>;
}

export function AdminPager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  return (
    <nav className="adminPager" aria-label="分页">
      <span>共 {total} 条，第 {Math.min(page, pages)} / {pages} 页</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>上一页</button>
        <button type="button" disabled={page >= pages} onClick={() => onPageChange(Math.min(pages, page + 1))}>下一页</button>
      </div>
    </nav>
  );
}

export function AdminModal({
  title,
  description,
  onClose,
  footer,
  size = 'medium',
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
}) {
  return (
    <div className="adminModalLayer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="adminModalBackdrop" type="button" aria-label="关闭弹窗" onClick={onClose} />
      <section className={`adminModal is-${size}`}>
        <header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" aria-label="关闭" onClick={onClose}><AppIcon name="close" /></button></header>
        <div className="adminModalBody">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

export function AdminNotice({ message, tone = 'info', onClose }: { message: string; tone?: 'info' | 'success' | 'danger'; onClose?: () => void }) {
  if (!message) return null;
  return <div className={`adminNotice is-${tone}`} role="status"><span>{message}</span>{onClose && <button type="button" onClick={onClose}><AppIcon name="close" /></button>}</div>;
}

export function AdminTable({ columns, children, minWidth = 900 }: { columns: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="adminTableWrap">
      <table style={{ minWidth }}>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminTime({ value }: { value: unknown }) {
  return <>{formatAdminTime(value)}</>;
}
