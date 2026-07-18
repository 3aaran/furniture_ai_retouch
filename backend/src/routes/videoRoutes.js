// 中文说明：注册独立视频任务、受权播放与下载路由，并支持本地 HTTP Range。
import fs from 'fs';
import path from 'path';

import { requireAuth as defaultRequireAuth } from '../auth.js';
import { pool } from '../db.js';
import {
  deleteVideoTask,
  getRecentVideoTasks,
  getVideoTaskDetail,
  getVideoTaskStatus,
  submitVideoTask
} from '../ai/videoTaskService.js';
import { canAccessVideoTask } from '../ai/videoTaskDomain.js';
import { buildVideoAccessFields, parseVideoByteRange } from '../services/videoStorageService.js';
import { STORAGE_ROOT, diskPathFromStorageKey } from '../services/storageService.js';

const defaultService = {
  submitVideoTask,
  getRecentVideoTasks,
  getVideoTaskStatus,
  getVideoTaskDetail,
  deleteVideoTask
};

function errorStatus(error) {
  if (error?.status) return Number(error.status);
  const message = String(error?.message || '');
  if (/无权|权限/.test(message)) return 403;
  if (/不存在/.test(message)) return 404;
  return 400;
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(errorStatus(error)).json({
        message: error?.message || '视频服务异常',
        code: error?.code || undefined
      });
    }
  };
}

async function findVideoForUser(videoId, user) {
  const [[video]] = await pool.query(
    `SELECT v.*,t.status task_status,t.user_id task_user_id,t.merchant_id task_merchant_id
     FROM videos v
     LEFT JOIN ai_tasks t ON t.id=v.task_id
     WHERE v.id=? AND v.status='ACTIVE' AND v.deleted_at IS NULL LIMIT 1`,
    [videoId]
  );
  if (!video) return null;
  const accessTask = {
    user_id: video.task_user_id || video.user_id,
    merchant_id: video.task_merchant_id || video.merchant_id
  };
  return canAccessVideoTask(accessTask, user) ? video : null;
}

function localVideoFile(video) {
  const filePath = path.resolve(diskPathFromStorageKey(video.storage_key || ''));
  const root = path.resolve(STORAGE_ROOT);
  if (!(filePath === root || filePath.startsWith(root + path.sep))) {
    const error = new Error('视频存储路径无效');
    error.status = 400;
    throw error;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    const error = new Error('视频文件不存在');
    error.status = 404;
    throw error;
  }
  return {
    filePath,
    sizeBytes: Number(stat.size || video.size_bytes || 0),
    mimeType: video.mime_type || 'video/mp4'
  };
}

export function sendLocalVideoStream(req, res, file, options = {}) {
  const createReadStream = options.createReadStream || fs.createReadStream;
  let range;
  try {
    range = parseVideoByteRange(req.headers?.range || '', Number(file.sizeBytes || 0));
  } catch (error) {
    if (error.status !== 416) throw error;
    res.status(416);
    res.setHeader('Content-Range', error.contentRange || `bytes */${Number(file.sizeBytes || 0)}`);
    res.setHeader('Accept-Ranges', 'bytes');
    return res.end();
  }

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', file.mimeType || 'video/mp4');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  if (range) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${file.sizeBytes}`);
    res.setHeader('Content-Length', range.length);
    return createReadStream(file.filePath, { start: range.start, end: range.end }).pipe(res);
  }
  res.status(200);
  res.setHeader('Content-Length', Number(file.sizeBytes || 0));
  return createReadStream(file.filePath).pipe(res);
}

export function registerVideoRoutes(app, options = {}) {
  const auth = options.requireAuth || defaultRequireAuth;
  const service = options.service || defaultService;
  const findVideo = options.findVideo || findVideoForUser;
  const getLocalFile = options.getLocalFile || localVideoFile;

  app.post('/api/ai/video/tasks', auth, asyncRoute(async (req, res) => {
    res.status(202).json(await service.submitVideoTask(req.body, req.user));
  }));
  app.get('/api/ai/video/tasks/recent', auth, asyncRoute(async (req, res) => {
    res.json(await service.getRecentVideoTasks(req.user, req.query));
  }));
  app.get('/api/ai/video/tasks/:id/status', auth, asyncRoute(async (req, res) => {
    res.json(await service.getVideoTaskStatus(req.params.id, req.user));
  }));
  app.get('/api/ai/video/tasks/:id', auth, asyncRoute(async (req, res) => {
    res.json(await service.getVideoTaskDetail(req.params.id, req.user));
  }));
  app.delete('/api/ai/video/tasks/:id', auth, asyncRoute(async (req, res) => {
    res.json(await service.deleteVideoTask(req.params.id, req.user));
  }));
  app.get('/api/videos/:id/stream', auth, asyncRoute(async (req, res) => {
    const video = await findVideo(req.params.id, req.user);
    if (!video) {
      const error = new Error('视频不存在或无权访问');
      error.status = 404;
      throw error;
    }
    if (String(video.storage_provider || '').toLowerCase() === 'oss') {
      return res.redirect(buildVideoAccessFields(video).videoUrl);
    }
    return sendLocalVideoStream(req, res, getLocalFile(video));
  }));
  app.get('/api/videos/:id/download', auth, asyncRoute(async (req, res) => {
    const video = await findVideo(req.params.id, req.user);
    if (!video) {
      const error = new Error('视频不存在或无权访问');
      error.status = 404;
      throw error;
    }
    if (String(video.storage_provider || '').toLowerCase() === 'oss') {
      return res.redirect(buildVideoAccessFields(video).downloadUrl);
    }
    const file = getLocalFile(video);
    return res.download(file.filePath, video.original_name || video.file_name || `${video.id}.mp4`);
  }));
}
