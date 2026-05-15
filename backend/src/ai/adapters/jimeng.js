// 火山 / 即梦 适配器。
// 当前先复用通用 JSON 调用方式，后续若接口格式不同，只改这一个文件。
import customAdapter from './custom.js';
export async function generate(params) { return customAdapter.generate({ ...params, provider: 'jimeng' }); }
export default { generate };
