import { runAi } from '../../aiService.js';

export async function generate(params) {
  return runAi({
    operation: params.featureKey,
    imagePath: params.imagePath,
    prompt: params.prompt,
    merchantId: params.merchantId || null,
    userId: params.userId || null
  });
}

export default { generate };
