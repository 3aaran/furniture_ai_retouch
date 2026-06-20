import { workflowFromRow } from './workflowDomain.js';

const mysqlDate = value => value instanceof Date ? value : new Date(value);

export function createMysqlWorkflowStore(pool) {
  return {
    async list({ keyword = '', status = '', type = '', page = 1, pageSize = 10 }) {
      const where = [];
      const params = [];
      if (keyword) {
        where.push('(name LIKE ? OR code LIKE ? OR description LIKE ? OR scene LIKE ?)');
        const like = `%${keyword}%`;
        params.push(like, like, like, like);
      }
      if (status) { where.push('status=?'); params.push(status); }
      if (type) { where.push('type=?'); params.push(type); }
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const [[count]] = await pool.query(`SELECT COUNT(*) total FROM workflow_templates${clause}`, params);
      const offset = (page - 1) * pageSize;
      const [rows] = await pool.query(
        `SELECT * FROM workflow_templates${clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      return { items: rows.map(workflowFromRow), total: Number(count.total || 0) };
    },
    async get(id) {
      const [[row]] = await pool.query('SELECT * FROM workflow_templates WHERE id=? LIMIT 1', [id]);
      return workflowFromRow(row);
    },
    async codeExists(code, excludeId = '') {
      const [rows] = excludeId
        ? await pool.query('SELECT id FROM workflow_templates WHERE code=? AND id<>? LIMIT 1', [code, excludeId])
        : await pool.query('SELECT id FROM workflow_templates WHERE code=? LIMIT 1', [code]);
      return rows.length > 0;
    },
    async insert(workflow) {
      await pool.query(
        `INSERT INTO workflow_templates(
          id,name,code,description,type,scene,status,version,canvas_json,config_json,is_example,created_by,updated_by,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          workflow.id, workflow.name, workflow.code, workflow.description,
          workflow.type, workflow.scene, workflow.status, workflow.version,
          JSON.stringify(workflow.canvasJson), JSON.stringify(workflow.configJson),
          workflow.isExample ? 1 : 0, workflow.createdBy, workflow.updatedBy,
          mysqlDate(workflow.createdAt), mysqlDate(workflow.updatedAt)
        ]
      );
      return this.get(workflow.id);
    },
    async update(id, patch) {
      const fields = [];
      const params = [];
      const columns = {
        name: 'name',
        code: 'code',
        description: 'description',
        type: 'type',
        scene: 'scene',
        status: 'status',
        version: 'version',
        canvasJson: 'canvas_json',
        configJson: 'config_json',
        isExample: 'is_example',
        updatedBy: 'updated_by',
        updatedAt: 'updated_at'
      };
      for (const [key, column] of Object.entries(columns)) {
        if (patch[key] === undefined) continue;
        fields.push(`${column}=?`);
        if (key === 'canvasJson' || key === 'configJson') params.push(JSON.stringify(patch[key]));
        else if (key === 'isExample') params.push(patch[key] ? 1 : 0);
        else if (key === 'updatedAt') params.push(mysqlDate(patch[key]));
        else params.push(patch[key]);
      }
      if (!fields.length) return this.get(id);
      const [result] = await pool.query(`UPDATE workflow_templates SET ${fields.join(',')} WHERE id=?`, [...params, id]);
      return result.affectedRows ? this.get(id) : null;
    },
    async remove(id) {
      const [result] = await pool.query('DELETE FROM workflow_templates WHERE id=?', [id]);
      return result.affectedRows > 0;
    }
  };
}
