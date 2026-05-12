import Conf from 'conf';

export interface Config {
  defaultProvider?: string;
  defaultModel?: string;
  apiKeys?: Record<string, string>;
}

export class ConfigManager {
  private conf: Conf<Config>;

  constructor() {
    this.conf = new Conf({ projectName: 'selfer' });
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.conf.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]) {
    this.conf.set(key, value);
  }

  setApiKey(provider: string, key: string) {
    const apiKeys = this.get('apiKeys') || {};
    apiKeys[provider] = key;
    this.set('apiKeys', apiKeys);
  }

  getApiKey(provider: string): string | undefined {
    return this.get('apiKeys')?.[provider];
  }

  clear() {
    this.conf.clear();
  }
}
