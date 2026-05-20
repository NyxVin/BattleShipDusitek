export function mergeConfig(defaultCfg: any, cmsCfg: any) {
  if (!cmsCfg) return defaultCfg;

  return {
    ...defaultCfg,
    ...cmsCfg,
  };
}