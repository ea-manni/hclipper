import React, { useState, useEffect } from 'react';
import { HardDrive, X, Check, Key, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import type { ApiKeysSettings } from '../context/WorkflowContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'storage' | 'keys';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'storage'
}) => {
  const { settings, updateSettings, openDirectory, addLog } = useWorkflow();
  const [activeTab, setActiveTab] = useState<'storage' | 'keys'>(initialTab);
  const [downloadsDir, setDownloadsDir] = useState(settings.downloadsDir);
  const [clipsDir, setClipsDir] = useState(settings.clipsDir);
  const [apiKeys, setApiKeys] = useState<ApiKeysSettings>(settings.apiKeys || {});
  const [defaultProvider, setDefaultProvider] = useState<string>(settings.defaultProvider || 'gemini');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [visibleKey, setVisibleKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setDownloadsDir(settings.downloadsDir);
      setClipsDir(settings.clipsDir);
      setApiKeys(settings.apiKeys || {});
      setDefaultProvider(settings.defaultProvider || 'gemini');
      setSaveSuccess(false);
    }
  }, [isOpen, settings, initialTab]);

  if (!isOpen) return null;

  const toggleVisibility = (provider: string) => {
    setVisibleKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleKeyChange = (provider: keyof ApiKeysSettings, val: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: val.trim() }));
  };

  const openLink = (url: string) => {
    if (window.hclipper?.openPath) {
      window.hclipper.openPath(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handlePickDownloadsDir = async () => {
    if (window.hclipper?.selectDirectory) {
      const selected = await window.hclipper.selectDirectory({
        title: 'Choose Destination Folder for Video Downloads'
      });
      if (selected) {
        setDownloadsDir(selected);
      }
    }
  };

  const handlePickClipsDir = async () => {
    if (window.hclipper?.selectDirectory) {
      const selected = await window.hclipper.selectDirectory({
        title: 'Choose Destination Folder for Rendered Master Clips'
      });
      if (selected) {
        setClipsDir(selected);
      }
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings({ 
      downloadsDir, 
      clipsDir,
      apiKeys,
      defaultProvider
    });
    setSaveSuccess(true);
    addLog(`Preferences saved: Storage and ${Object.keys(apiKeys).filter(k => (apiKeys as any)[k]).length} AI API Keys updated.`, 'success');
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const providerConfigs: {
    key: keyof ApiKeysSettings;
    name: string;
    badge: string;
    badgeColor: string;
    placeholder: string;
    url: string;
    urlLabel: string;
    desc: string;
  }[] = [
    {
      key: 'gemini',
      name: 'Google Gemini',
      badge: '100% Free Forever (15 RPM)',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      placeholder: 'AIzaSy...',
      url: 'https://aistudio.google.com/app/apikey',
      urlLabel: 'Get Free Key in AI Studio',
      desc: 'Gemini 2.5 Flash / 1.5 Flash. Ultra-fast narrative reasoning with zero credit card required.'
    },
    {
      key: 'groq',
      name: 'GroqCloud',
      badge: 'Free Tier (500 T/s Llama 3.3 70B & Whisper)',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      placeholder: 'gsk_...',
      url: 'https://console.groq.com/keys',
      urlLabel: 'Get Free Key on GroqCloud',
      desc: 'Hardware LPU acceleration for instant transcript summarization and Whisper-large-v3.'
    },
    {
      key: 'deepseek',
      name: 'DeepSeek',
      badge: 'DeepSeek-V3 / R1 Reasoning',
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      placeholder: 'sk-...',
      url: 'https://platform.deepseek.com/api_keys',
      urlLabel: 'Get DeepSeek Key',
      desc: 'Affordable, state-of-the-art open-weights reasoning model with high comprehension.'
    },
    {
      key: 'xai',
      name: 'xAI (Grok)',
      badge: 'Grok-2 AI Reasoning',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      placeholder: 'xai-...',
      url: 'https://console.x.ai/',
      urlLabel: 'Get xAI Key',
      desc: 'xAI Grok-2 multimodal and real-time reasoning capabilities.'
    },
    {
      key: 'openai',
      name: 'OpenAI',
      badge: 'GPT-4o & GPT-4o-mini',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      placeholder: 'sk-...',
      url: 'https://platform.openai.com/api-keys',
      urlLabel: 'Get OpenAI Key',
      desc: 'Industry standard GPT-4o family models for transcript synthesis and structured JSON.'
    },
    {
      key: 'claude',
      name: 'Anthropic Claude',
      badge: 'Claude 3.5 Sonnet & Haiku',
      badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      placeholder: 'sk-ant-...',
      url: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'Get Claude Key',
      desc: 'Nuanced conversational comprehension and rhetorical point extraction.'
    },
    {
      key: 'kimi',
      name: 'Moonshot AI (Kimi)',
      badge: 'Long-Context Narrative AI',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      placeholder: 'sk-...',
      url: 'https://platform.moonshot.cn/console/api-keys',
      urlLabel: 'Get Moonshot Kimi Key',
      desc: 'High context window support for full 2-hour conference and sermon transcripts.'
    },
    {
      key: 'ollamaUrl',
      name: 'Ollama / Local LLM',
      badge: '100% Offline & Private',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      placeholder: 'http://localhost:11434',
      url: 'https://ollama.com',
      urlLabel: 'Install Ollama (Local)',
      desc: 'Run Llama 3.2, Mistral, or Qwen completely free and locally on your own machine.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card bg-[#0e121c] border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Studio Settings & Preferences</h3>
              <p className="text-[11px] text-slate-400">Manage global storage directories and AI provider API keys</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-white/10 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'storage'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage & Output Folders</span>
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'keys'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI Model & Provider API Keys</span>
            {Object.values(apiKeys).filter(Boolean).length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'keys' ? 'bg-black text-amber-400' : 'bg-amber-400/20 text-amber-300'}`}>
                {Object.values(apiKeys).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {activeTab === 'storage' && (
            <div className="space-y-4 text-xs">
              {/* Downloads Folder */}
              <div className="space-y-1.5 glass-card p-4 rounded-xl border-white/5 bg-slate-900/60">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Stream Downloads Directory</span>
                  <button
                    type="button"
                    onClick={() => openDirectory(downloadsDir)}
                    className="text-amber-400 hover:underline text-[10px] lowercase flex items-center gap-1"
                  >
                    <span>reveal in explorer</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={downloadsDir}
                    onChange={(e) => setDownloadsDir(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handlePickDownloadsDir}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Folder where raw YouTube/webinar/podcast streams are cached before reframing.
                </p>
              </div>

              {/* Clips Folder */}
              <div className="space-y-1.5 glass-card p-4 rounded-xl border-white/5 bg-slate-900/60">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Rendered Master Shorts Directory</span>
                  <button
                    type="button"
                    onClick={() => openDirectory(clipsDir)}
                    className="text-amber-400 hover:underline text-[10px] lowercase flex items-center gap-1"
                  >
                    <span>reveal in explorer</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={clipsDir}
                    onChange={(e) => setClipsDir(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handlePickClipsDir}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-xs transition-colors shrink-0"
                  >
                    Browse...
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Folder where finished 9:16 vertical shorts (burned with captions & hooks) are exported.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-4 text-xs">
              {/* Default Provider Selector */}
              <div className="glass-card p-3.5 rounded-xl border-amber-400/20 bg-amber-400/5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 text-xs block">Default AI Highlight Scout Provider</span>
                  <span className="text-[10px] text-slate-400">Auto-selected in Step 2: AI Clip Scout</span>
                </div>
                <select
                  value={defaultProvider}
                  onChange={(e) => setDefaultProvider(e.target.value)}
                  className="bg-slate-900 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none"
                >
                  <option value="gemini">Google Gemini (Recommended - 100% Free)</option>
                  <option value="groq">GroqCloud (Llama 3.3 70B - Ultra Fast)</option>
                  <option value="deepseek">DeepSeek (V3 / R1)</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                  <option value="claude">Anthropic Claude (3.5 Haiku / Sonnet)</option>
                  <option value="xai">xAI Grok-2</option>
                  <option value="kimi">Moonshot AI (Kimi)</option>
                  <option value="local">Ollama / Local LLM (Offline)</option>
                </select>
              </div>

              {/* Provider List */}
              <div className="space-y-3">
                {providerConfigs.map((cfg) => {
                  const val = (apiKeys as any)[cfg.key] || '';
                  const isVisible = !!visibleKey[cfg.key];
                  const hasKey = Boolean(val.trim());

                  return (
                    <div 
                      key={cfg.key}
                      className="glass-card p-3.5 rounded-xl border-white/10 bg-slate-900/70 space-y-2 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{cfg.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cfg.badgeColor}`}>
                            {cfg.badge}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openLink(cfg.url)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>{cfg.urlLabel}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            value={val}
                            onChange={(e) => handleKeyChange(cfg.key, e.target.value)}
                            placeholder={cfg.placeholder}
                            className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs font-mono pr-9 focus:outline-none transition-colors ${
                              hasKey
                                ? 'border-emerald-500/50 text-emerald-300'
                                : 'border-white/15 text-white focus:border-amber-400/50'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleVisibility(cfg.key as string)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            title={isVisible ? 'Hide key' : 'Show key'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {hasKey && (
                          <div className="flex items-center text-emerald-400 font-bold text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 leading-snug">
                        {cfg.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
          {saveSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Settings and API keys saved successfully!</span>
            </span>
          ) : <div className="text-[11px] text-slate-400">Keys are stored securely in your local environment.</div>}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              Save All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
