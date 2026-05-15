export const acceptanceRules = {
  toast: {
    successColor: 'green',
    errorColor: 'red',
    source: '统一 Toast 组件',
    note: '当前先统一入口，逐页验收规则后续补充。'
  },
  status: {
    source: 'frontend/src/config/uiText.js',
    rule: '页面展示必须使用中文状态名，接口枚举不得直接显示。'
  },
  button: {
    source: 'frontend/src/config/uiText.js + uiIcons.jsx',
    rule: '同一语义按钮共用同一文字和图标 key。'
  },
  permission: {
    source: 'backend/src/config/permissionMatrix.js',
    rule: '前端隐藏入口不是权限控制，接口必须做权限校验。'
  }
};
