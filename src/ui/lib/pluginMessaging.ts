import type { DesignSystemValue } from '../types';

type OutgoingPluginMessage =
  | {
      type: 'request-initial-state';
    }
  | {
      type: 'build-selected-payload';
      requestId: number;
    }
  | {
      type: 'set-design-system';
      designSystem: DesignSystemValue;
    }
  | {
      type: 'set-team';
      team: string;
    }
  | {
      type: 'set-send-endpoint';
      sendEndpoint: string;
    };

export const postPluginMessage = (message: OutgoingPluginMessage): void => {
  parent.postMessage({ pluginMessage: message }, '*');
};
