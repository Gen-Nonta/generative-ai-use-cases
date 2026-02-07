import * as cdk from 'aws-cdk-lib';
import {
  StackInput,
  stackInputSchema,
  ProcessedStackInput,
} from './lib/stack-input';
import { ModelConfiguration } from 'generative-ai-use-cases';
import { loadBrandingConfig } from './branding';

// Get parameters from CDK Context
const getContext = (app: cdk.App): StackInput => {
  const params = stackInputSchema.parse(app.node.getAllContext());
  return params;
};

// If you want to define parameters directly
const envs: Record<string, Partial<StackInput>> = {
  // If you want to define an anonymous environment, uncomment the following and the content of cdk.json will be ignored.
  // If you want to define an anonymous environment in parameter.ts, uncomment the following and the content of cdk.json will be ignored.
  // '': {
  //   // Parameters for anonymous environment
  //   // If you want to override the default settings, add the following
  // },
  dev: {
    // Parameters for development environment
    modelRegion: 'us-west-2',
    modelIds: [
      'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
      'global.anthropic.claude-haiku-4-5-20251001-v1:0',
      'global.anthropic.claude-opus-4-5-20251101-v1:0',
      'amazon.nova-pro-v1:0',
      'amazon.nova-lite-v1:0',
      'amazon.nova-micro-v1:0',
      'global.amazon.nova-2-lite-v1:0',
      'us.amazon.nova-premier-v1:0',
      //'amazon.titan-text-premier-v1:0',
      'openai.gpt-oss-120b-1:0',
      'openai.gpt-oss-20b-1:0',
      'google.gemma-3-4b-it',
      'google.gemma-3-12b-it',
      'google.gemma-3-27b-it',
      'deepseek.v3-v1:0',
      'us.deepseek.r1-v1:0',
    ],
    imageGenerationModelIds: [
      { modelId: 'amazon.nova-canvas-v1:0', region: 'us-east-1' },
      'stability.sd3-5-large-v1:0',
      'stability.stable-image-core-v1:1',
      'stability.stable-image-ultra-v1:1',
      //'stability.stable-diffusion-xl-v1',
    ],
    videoGenerationModelIds: [
      { modelId: 'amazon.nova-reel-v1:0', region: 'us-east-1' },
      { modelId: 'amazon.nova-reel-v1:1', region: 'us-east-1' },
      'luma.ray-v2:0',
    ],
    speechToSpeechModelIds: ['amazon.nova-sonic-v1:0'],
    selfSignUpEnabled: false,
  },
  staging: {
    // Parameters for staging environment
  },
  prod: {
    // Parameters for production environment
  },
  // If you need other environments, customize them as needed
};

// For backward compatibility, get parameters from CDK Context > parameter.ts
export const getParams = (app: cdk.App): ProcessedStackInput => {
  // By default, get parameters from CDK Context
  let params = getContext(app);

  // If the env matches the ones defined in envs, use the parameters in envs instead of the ones in context
  if (envs[params.env]) {
    params = stackInputSchema.parse({
      ...envs[params.env],
      env: params.env,
    });
  }
  // Make the format of modelIds, imageGenerationModelIds consistent
  const convertToModelConfiguration = (
    models: (string | ModelConfiguration)[],
    defaultRegion: string
  ): ModelConfiguration[] => {
    return models.map((model) =>
      typeof model === 'string'
        ? { modelId: model, region: defaultRegion }
        : model
    );
  };

  return {
    ...params,
    modelIds: convertToModelConfiguration(params.modelIds, params.modelRegion),
    imageGenerationModelIds: convertToModelConfiguration(
      params.imageGenerationModelIds,
      params.modelRegion
    ),
    videoGenerationModelIds: convertToModelConfiguration(
      params.videoGenerationModelIds,
      params.modelRegion
    ),
    speechToSpeechModelIds: convertToModelConfiguration(
      params.speechToSpeechModelIds,
      params.modelRegion
    ),
    endpointNames: convertToModelConfiguration(
      params.endpointNames,
      params.modelRegion
    ),
    // Process agentCoreRegion: null -> modelRegion
    agentCoreRegion: params.agentCoreRegion || params.modelRegion,
    // Load branding configuration
    brandingConfig: loadBrandingConfig(),
  };
};
