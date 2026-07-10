import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../../services/http';
import { HistoryPage } from './HistoryPage';
import { ProfilePage } from './ProfilePage';
import { PromotionPage } from './PromotionPage';
import { QuotaPage } from './QuotaPage';
import { TaskCompareModal } from '../../components/tasks/TaskCompareModal';
import { UserActionModal } from './UserActionModal';
import { UsersPage } from './UsersPage';
import type { OperationsPageType, Row, UserModalState } from './operations.types';
import './OperationsPage.css';
import './OperationsAccountPages.css';

async function loadTaskDetail(item: Row) {
  const id = item.id || item.imageId || item.related_task_id || item.relatedTaskId;
  if (!id) return item;
  try {
    return await request<Row>(`/api/images/${encodeURIComponent(String(id))}/detail-rich`);
  } catch {
    try {
      return await request<Row>(`/api/ai/tasks/${encodeURIComponent(String(id))}`);
    } catch {
      return item;
    }
  }
}

export function OperationsPage({ type }: { type: OperationsPageType }) {
  const navigate = useNavigate();
  const [userModal, setUserModal] = useState<UserModalState>(null);
  const [taskDetail, setTaskDetail] = useState<Row | null>(null);
  const [taskList, setTaskList] = useState<Row[]>([]);
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((value) => value + 1);

  async function openTask(item: Row, list: Row[] = []) {
    setTaskList(list.length ? list : taskList);
    setTaskDetail(await loadTaskDetail(item));
  }

  function continueImage(img: Row) {
    localStorage.setItem('pendingWorkbenchImage', JSON.stringify(img));
    setTaskDetail(null);
    navigate('/studio');
  }

  return (
    <div className="opShell">
      {notice && <button className="opToast" type="button" onClick={() => setNotice('')}>{notice}</button>}
      {type === 'history' && <HistoryPage openTask={openTask} />}
      {type === 'users' && <UsersPage setNotice={setNotice} openModal={setUserModal} reloadKey={reloadKey} />}
      {type === 'promotion' && <PromotionPage setNotice={setNotice} />}
      {type === 'profile' && <ProfilePage setNotice={setNotice} />}
      {type === 'quota' && <QuotaPage openTask={openTask} />}
      <TaskCompareModal detail={taskDetail} taskList={taskList} onClose={() => setTaskDetail(null)} onSwitchTask={(item) => openTask(item, taskList)} onContinueImage={continueImage} />
      <UserActionModal modal={userModal} close={() => setUserModal(null)} setNotice={setNotice} refresh={refresh} />
    </div>
  );
}
