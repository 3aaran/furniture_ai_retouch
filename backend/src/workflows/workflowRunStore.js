const mysqlDate = value => value instanceof Date ? value : new Date(value);
const dateIso = value => value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;

const runFromRow = row => row ? {
  id: row.id,
  workflowTemplateId: row.workflow_template_id,
  userId: row.user_id,
  merchantId: row.merchant_id,
  status: row.status,
  originImageId: row.origin_image_id,
  resultImageId: row.result_image_id,
  currentNodeId: row.current_node_id,
  errorMessage: row.error_message || '',
  startedAt: dateIso(row.started_at),
  finishedAt: dateIso(row.finished_at),
  createdAt: dateIso(row.created_at)
} : null;

const nodeFromRow = row => ({
  id: row.id,
  workflowRunId: row.workflow_run_id,
  nodeId: row.node_id,
  nodeType: row.node_type,
  featureKey: row.feature_key || '',
  status: row.status,
  inputImageId: row.input_image_id || null,
  outputImageId: row.output_image_id || null,
  aiTaskId: row.ai_task_id || null,
  errorMessage: row.error_message || '',
  startedAt: dateIso(row.started_at),
  finishedAt: dateIso(row.finished_at),
  sortOrder: Number(row.sort_order || 0)
});

export function createMysqlWorkflowRunStore(pool) {
  return {
    async createRun(run, nodes) {
      await pool.query(
        `INSERT INTO workflow_runs(
          id,workflow_template_id,user_id,merchant_id,status,origin_image_id,created_at
        ) VALUES(?,?,?,?,?,?,?)`,
        [run.id, run.workflowTemplateId, run.userId, run.merchantId || null, run.status, run.originImageId, mysqlDate(run.createdAt)]
      );
      for (const node of nodes) {
        await pool.query(
          `INSERT INTO workflow_run_nodes(
            id,workflow_run_id,node_id,node_type,feature_key,status,sort_order
          ) VALUES(?,?,?,?,?,?,?)`,
          [node.id, run.id, node.nodeId, node.nodeType, node.featureKey || null, node.status, node.sortOrder]
        );
      }
      return this.getRun(run.id);
    },
    async updateRun(id, patch) {
      const columns = {
        status: 'status',
        resultImageId: 'result_image_id',
        currentNodeId: 'current_node_id',
        errorMessage: 'error_message',
        startedAt: 'started_at',
        finishedAt: 'finished_at'
      };
      const fields = [];
      const params = [];
      for (const [key, column] of Object.entries(columns)) {
        if (patch[key] === undefined) continue;
        fields.push(`${column}=?`);
        params.push(key.endsWith('At') && patch[key] ? mysqlDate(patch[key]) : patch[key]);
      }
      if (fields.length) await pool.query(`UPDATE workflow_runs SET ${fields.join(',')} WHERE id=?`, [...params, id]);
    },
    async updateNode(runId, nodeId, patch) {
      const columns = {
        status: 'status',
        inputImageId: 'input_image_id',
        outputImageId: 'output_image_id',
        aiTaskId: 'ai_task_id',
        errorMessage: 'error_message',
        startedAt: 'started_at',
        finishedAt: 'finished_at'
      };
      const fields = [];
      const params = [];
      for (const [key, column] of Object.entries(columns)) {
        if (patch[key] === undefined) continue;
        fields.push(`${column}=?`);
        params.push(key.endsWith('At') && patch[key] ? mysqlDate(patch[key]) : patch[key]);
      }
      if (fields.length) await pool.query(`UPDATE workflow_run_nodes SET ${fields.join(',')} WHERE workflow_run_id=? AND node_id=?`, [...params, runId, nodeId]);
    },
    async getRun(id) {
      const [[row]] = await pool.query('SELECT * FROM workflow_runs WHERE id=? LIMIT 1', [id]);
      if (!row) return null;
      const [nodes] = await pool.query('SELECT * FROM workflow_run_nodes WHERE workflow_run_id=? ORDER BY sort_order ASC', [id]);
      return { ...runFromRow(row), nodes: nodes.map(nodeFromRow) };
    }
  };
}
