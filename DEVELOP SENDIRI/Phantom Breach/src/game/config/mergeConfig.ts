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

        ship_cooldowns:
          cmsCfg.config?.gameplay?.ship_cooldowns ??
          defaultCfg.config.gameplay.ship_cooldowns,

        score: {
          ...defaultCfg.config.gameplay.score,
          ...cmsCfg.config?.gameplay?.score,
        },
      },

      assets: {
        ...defaultCfg.config.assets,
        ...cmsCfg.config?.assets,
      },

      ui: {
        ...defaultCfg.config.ui,
        ...cmsCfg.config?.ui,

        text: {
          ...defaultCfg.config.ui.text,
          ...cmsCfg.config?.ui?.text,
        },

        colors: {
          ...defaultCfg.config.ui.colors,
          ...cmsCfg.config?.ui?.colors,
        },

        header: {
          ...defaultCfg.config.ui.header,
          ...cmsCfg.config?.ui?.header,
        },

        result: {
          ...defaultCfg.config.ui.result,
          ...cmsCfg.config?.ui?.result,
        },
      },
    },
  };
}