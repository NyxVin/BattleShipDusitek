export function mergeConfig(defaultCfg: any, cmsCfg: any) {
  if (!cmsCfg) return defaultCfg;

  return {
    ...defaultCfg,
    config: {
      ...defaultCfg.config,
      ...cmsCfg.config,

      gameplay: {
        ...defaultCfg.config.gameplay,
        ...cmsCfg.config?.gameplay,
        ship_cooldowns: cmsCfg.config?.gameplay?.ship_cooldowns ?? defaultCfg.config.gameplay.ship_cooldowns,
      },

      assets: {
        ...defaultCfg.config.assets,
        ...cmsCfg.config?.assets,
      },

      ui: {
        ...defaultCfg.config.ui,
        ...cmsCfg.config?.ui,
      },

      result: {
        ...defaultCfg.config.result,
        ...cmsCfg.config?.result,
      },

      score: {
        ...defaultCfg.config.score,
        ...cmsCfg.config?.score,
      },
    },
  };
}
