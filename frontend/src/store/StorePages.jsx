import Workbench from'./workbench/Workbench.jsx';
import StoreUsers from'./users/InternalUsersPage.jsx';
import StoreResources from'./resources/StoreResources.jsx';
import StoreTasks from'./tasks/StoreTasks.jsx';
import Promotion from'./promotion/Promotion.jsx';
import QuotaLogs from'./quota/QuotaLogs.jsx';
import{storeAdminPages,staffPages}from'../config/pageRegistry.jsx';

export const storeAdminNav=storeAdminPages;
export const staffNav=staffPages;

export{Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs};
