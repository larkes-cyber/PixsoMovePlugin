import { defineConfig } from '@pixso/plugin-cli';

export default defineConfig({
  main: './src/main/index.ts',
  ui: './src/ui/index.ts',
  template: './src/ui/ui.html',
  frame: 'none'
});
