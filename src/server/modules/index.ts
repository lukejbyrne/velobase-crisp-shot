import { getEnabledModuleDefinitions } from "@/config/modules";
import { appEvents } from "@/server/events/bus";
import type { FrameworkModule } from "@/server/modules/registry";
import { createLogger } from "@/lib/logger";

const log = createLogger("modules");

let activeModules: FrameworkModule[] = [];

export async function initModules(): Promise<FrameworkModule[]> {
  const modules: FrameworkModule[] = [];
  const definitions = getEnabledModuleDefinitions().filter(
    (definition) => definition.loadFrameworkModule,
  );

  for (const definition of definitions) {
    const frameworkModule = await definition.loadFrameworkModule?.();
    if (frameworkModule) {
      modules.push(frameworkModule);
    }
  }

  for (const mod of modules) {
    mod.registerEventHandlers?.(appEvents);
    await mod.onInit?.();
    log.info({ module: mod.name }, "Module initialized");
  }

  activeModules = modules;
  log.info(
    { modules: modules.map((m) => m.name) },
    `Initialized ${modules.length} modules`,
  );

  return modules;
}

export function getActiveModules(): FrameworkModule[] {
  return activeModules;
}
