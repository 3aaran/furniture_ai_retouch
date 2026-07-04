import Workbench from'../features/workbench/WorkbenchFeature.jsx';
import StoreUsers from'../features/store-admin/users/InternalUsersPage.jsx';
import StoreResources from'../features/resources/ResourcesFeature.jsx';
import StoreTasks from'../features/store-admin/tasks/StoreTasks.jsx';
import Promotion from'../features/store-admin/promotion/Promotion.jsx';
import QuotaLogs from'../features/store-admin/quota/QuotaLogs.jsx';
import{storeAdminPages,staffPages}from'../config/pageRegistry.jsx';

export const storeAdminNav=storeAdminPages;
export const staffNav=staffPages;

export{Workbench,StoreResources,StoreUsers,StoreTasks,Promotion,QuotaLogs};
