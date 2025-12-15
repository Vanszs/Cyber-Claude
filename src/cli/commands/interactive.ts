import { Command } from 'commander';
import { ui } from '../../utils/ui.js';
import { config, validateConfig } from '../../utils/config.js';
import { InteractiveSession } from '../session.js';
import { AgentMode } from '../../agent/types.js';
import { AVAILABLE_MODELS, getModelByKey, type ModelKey } from '../../utils/models.js';

export function createInteractiveCommand(): Command {
  const command = new Command('interactive');

  // Determine default model from config or fallback
  const defaultModelKey = (Object.keys(AVAILABLE_MODELS) as ModelKey[]).find(key =>
    AVAILABLE_MODELS[key].id === config.model
  ) || 'sonnet-4.5';

  command
    .description('Start interactive session (persistent REPL mode)')
    .alias('i')
    .option('-m, --mode <mode>', 'Initial agent mode: base, redteam, blueteam, desktopsecurity, webpentest, osint, smartcontract', 'base')
    .option('--model <model>', `AI model to use (default from .env: ${config.model})`)
    .action(async (options) => {
      const validation = validateConfig();
      if (!validation.valid) {
        ui.error('Configuration Error:');
        validation.errors.forEach(err => ui.error(`  ${err}`));
        process.exit(1);
      }

      // Validate mode
      const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest', 'osint', 'smartcontract'];
      if (!validModes.includes(options.mode)) {
        ui.error(`Invalid mode: ${options.mode}`);
        ui.info(`Valid modes: ${validModes.join(', ')}`);
        process.exit(1);
      }

      // Get model - prefer CLI option, then env config  
      let modelId = config.model; // Default from .env

      if (options.model) {
        // User specified model via CLI
        const modelConfig = getModelByKey(options.model);
        if (!modelConfig) {
          ui.error(`Invalid model: ${options.model}`);
          ui.info(`Valid models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
          process.exit(1);
        }
        modelId = modelConfig.id;
      }

      // Start interactive session
      const session = new InteractiveSession(
        options.mode as AgentMode,
        modelId
      );

      await session.start();
    });

  return command;
}