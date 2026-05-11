export function mergeConfig(defaultCfg: any, cmsCfg: any) {
  if (!cmsCfg) return defaultCfg;

  return {
    ...defaultCfg,
    schema: {
      ...defaultCfg.schema,
      ...cmsCfg.schema,

      gameplay: {
        ...defaultCfg.schema.gameplay,
        ...cmsCfg.schema?.gameplay,

        ship_cooldowns:
          cmsCfg.schema?.gameplay?.ship_cooldowns ??
          defaultCfg.schema.gameplay.ship_cooldowns,

        score: {
          ...defaultCfg.schema.gameplay.score,
          ...cmsCfg.schema?.gameplay?.score,
        },
      },

      assets: {
        ...defaultCfg.schema.assets,
        ...cmsCfg.schema?.assets,
      },

      ui: {
        ...defaultCfg.schema.ui,
        ...cmsCfg.schema?.ui,

        text: {
          ...defaultCfg.schema.ui.text,
          ...cmsCfg.schema?.ui?.text,
        },

        colors: {
          ...defaultCfg.schema.ui.colors,
          ...cmsCfg.schema?.ui?.colors,
        },

        header: {
          ...defaultCfg.schema.ui.header,
          ...cmsCfg.schema?.ui?.header,
        },

        result: {
          ...defaultCfg.schema.ui.result,
          ...cmsCfg.schema?.ui?.result,
        },
      },
    },
  };
}