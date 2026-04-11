import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface ModuleState {
  id: string;
  name: string;
  display_name: string;
  description: string;
  enabled: boolean;
  category: string;
  icon: string;
  sort_order: number;
  min_subscription_tier: string;
}

export function useModules() {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [moduleList, setModuleList] = useState<ModuleState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/modules/status').then(res => {
      const map: Record<string, boolean> = {};
      const list: ModuleState[] = [];
      for (const mod of res.data.data) {
        map[mod.name] = mod.enabled;
        list.push(mod);
      }
      setModules(map);
      setModuleList(list);
      setLoading(false);
    }).catch(() => {
      // Fallback: all modules enabled if endpoint not available
      setLoading(false);
    });
  }, []);

  const isEnabled = (moduleName: string): boolean => {
    // If modules haven't loaded yet, default to enabled
    if (Object.keys(modules).length === 0) return true;
    return modules[moduleName] ?? false;
  };

  const toggleModule = async (moduleId: string, enabled: boolean): Promise<boolean> => {
    try {
      await api.post(`/modules/${moduleId}/toggle`, { enabled });
      // Refresh modules
      const res = await api.get('/modules/status');
      const map: Record<string, boolean> = {};
      const list: ModuleState[] = [];
      for (const mod of res.data.data) {
        map[mod.name] = mod.enabled;
        list.push(mod);
      }
      setModules(map);
      setModuleList(list);
      return true;
    } catch {
      return false;
    }
  };

  return { modules, moduleList, isEnabled, toggleModule, loading };
}
