import { runAi } from '../../aiService.js';

export async function generate(params) {
  return runAi({ operation: params.featureKey, imagePath: params.imagePath, prompt: params.prompt });
}

export default { generate };
