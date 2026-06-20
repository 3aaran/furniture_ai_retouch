import { normalizeWorkflowInput, validateWorkflow } from './workflowDomain.js';

const makeError = (message, code, status = 400, details = null) =>
  Object.assign(new Error(message), { code, status, details });

export function createWorkflowService({ store, id, now }) {
  const getRequired = async workflowId => {
    const workflow = await store.get(workflowId);
    if (!workflow) throw makeError('工作流不存在', 'WORKFLOW_NOT_FOUND', 404);
    return workflow;
  };
  const assertCode = async (code, excludeId = '') => {
    if (!/^[A-Z0-9_]+$/.test(code)) throw makeError('code 只允许大写字母、数字和下划线', 'WORKFLOW_CODE_INVALID');
    if (await store.codeExists(code, excludeId)) throw makeError('工作流 code 已存在', 'WORKFLOW_CODE_EXISTS', 409);
  };
  const uniqueCopyCode = async base => {
    let index = 1;
    let candidate = `${base}_COPY`;
    while (await store.codeExists(candidate)) candidate = `${base}_COPY_${index++}`;
    return candidate;
  };
  return {
    async list(params = {}) {
      const page = Math.max(1, Number(params.page || 1));
      const pageSize = Math.min(50, Math.max(5, Number(params.pageSize || 10)));
      const query = {
        keyword: String(params.keyword || '').trim(),
        status: ['DRAFT', 'PUBLISHED', 'DISABLED'].includes(params.status) ? params.status : '',
        type: ['IMAGE', 'VIDEO', 'MIXED'].includes(params.type) ? params.type : '',
        page,
        pageSize
      };
      const result = await store.list(query);
      return { ...result, page, pageSize };
    },
    async get(workflowId) { return getRequired(workflowId); },
    async create(payload, userId) {
      const normalized = normalizeWorkflowInput(payload);
      if (!normalized.name) throw makeError('工作流名称不能为空', 'WORKFLOW_NAME_REQUIRED');
      await assertCode(normalized.code);
      const timestamp = now();
      return store.insert({
        id: id(),
        ...normalized,
        status: 'DRAFT',
        version: 0,
        versions: [],
        isExample: false,
        createdBy: userId,
        updatedBy: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async update(workflowId, payload, userId) {
      const current = await getRequired(workflowId);
      const normalized = normalizeWorkflowInput(payload);
      if (!normalized.name) throw makeError('工作流名称不能为空', 'WORKFLOW_NAME_REQUIRED');
      await assertCode(normalized.code, workflowId);
      return store.update(workflowId, {
        ...normalized,
        status: current.status,
        version: current.version,
        updatedBy: userId,
        updatedAt: now()
      });
    },
    async validate(workflowId) {
      return validateWorkflow(await getRequired(workflowId));
    },
    async publish(workflowId, userId) {
      const workflow = await getRequired(workflowId);
      const result = validateWorkflow(workflow);
      if (!result.valid) throw makeError('工作流校验失败', 'WORKFLOW_VALIDATION_FAILED', 400, result);
      return store.update(workflowId, {
        status: 'PUBLISHED',
        version: Number(workflow.version || 0) + 1,
        updatedBy: userId,
        updatedAt: now()
      });
    },
    async disable(workflowId, userId) {
      await getRequired(workflowId);
      return store.update(workflowId, { status: 'DISABLED', updatedBy: userId, updatedAt: now() });
    },
    async duplicate(workflowId, userId) {
      const source = await getRequired(workflowId);
      const timestamp = now();
      return store.insert({
        ...structuredClone(source),
        id: id(),
        name: `${source.name} 副本`,
        code: await uniqueCopyCode(source.code),
        status: 'DRAFT',
        version: 0,
        versions: [],
        isExample: false,
        createdBy: userId,
        updatedBy: userId,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async remove(workflowId) {
      if (!await store.remove(workflowId)) throw makeError('工作流不存在', 'WORKFLOW_NOT_FOUND', 404);
      return { message: '工作流已删除' };
    }
  };
}
