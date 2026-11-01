import React, { useState, useEffect } from 'react';
import type { OllamaModel, CatalogModel, HardwareInfo } from '../types';
import { X, Cpu, HardDrive, Download, Check, RefreshCw, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeModel: string;
  onSelectModel: (name: string) => void;
  installedModels: OllamaModel[];
  hardwareInfo: HardwareInfo | null;
  onRefreshModels: () => Promise<void>;
}

export const ModelManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeModel,
  onSelectModel,
  installedModels,
  hardwareInfo,
  onRefreshModels,
}) => {
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<{ status: string; percentage: number } | null>(null);
  const [customModelInput, setCustomModelInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/models/catalog')
        .then((res) => res.json())
        .then((data) => setCatalog(data.catalog || []))
        .catch((err) => console.error('Failed to fetch catalog', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePullModel = async (modelName: string) => {
    setPullingModel(modelName);
    setPullProgress({ status: 'Starting pull...', percentage: 0 });

    try {
      const response = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                setPullProgress({
                  status: data.status || 'downloading',
                  percentage: data.percentage || 0,
                });
                if (data.status === 'success') {
                  await onRefreshModels();
                  onSelectModel(modelName);
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error pulling model', e);
      setPullProgress({ status: 'Failed to pull model', percentage: 0 });
    } finally {
      setTimeout(() => {
        setPullingModel(null);
        setPullProgress(null);
      }, 2000);
    }
  };

  const gpu = hardwareInfo?.gpu;
  const vramTotal = gpu?.vram_total_mb || 0;
  const vramUsed = gpu?.vram_used_mb || 0;
  const vramPercent = vramTotal > 0 ? Math.round((vramUsed / vramTotal) * 100) : 0;

  const isModelInstalled = (name: string) => {
    const base = name.split(':')[0];
    return installedModels.some(
      (m) => m.name === name || m.name.startsWith(base + ':') || m.name === base
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Local Ollama Model Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Status Banner */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-medium text-slate-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{gpu?.name || 'NVIDIA GPU'}</span>
              </span>
              <span className="font-mono">{vramUsed} / {vramTotal} MB</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  vramPercent > 85 ? 'bg-rose-500' : vramPercent > 60 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${vramPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Dedicated VRAM</span>
              <span>{vramPercent}% used</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 font-medium text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>System RAM</span>
              </span>
              <span className="font-mono">
                {Math.round((hardwareInfo?.ram.ram_available_mb || 0) / 1024)}GB available / {Math.round((hardwareInfo?.ram.ram_total_mb || 0) / 1024)}GB total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Fastest inference occurs when weights stay inside 8GB VRAM (3B–8B models).
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Active Pull Progress Bar */}
          {pullingModel && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/50">
              <div className="flex items-center justify-between text-sm mb-2 text-cyan-300">
                <span className="font-medium flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Pulling {pullingModel}...</span>
                </span>
                <span className="font-mono">{pullProgress?.percentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-200"
                  style={{ width: `${pullProgress?.percentage || 0}%` }}
                />
              </div>
              <p className="text-xs text-cyan-400/80 mt-1.5 font-mono">{pullProgress?.status}</p>
            </div>
          )}

          {/* Installed Models Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider text-xs">
                Installed Models ({installedModels.length})
              </h3>
              <button
                onClick={onRefreshModels}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2">
              {installedModels.map((m) => {
                const isActive = activeModel === m.name;
                const compat = m.compatibility;
                return (
                  <div
                    key={m.name}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'border-cyan-500/80 bg-cyan-950/20'
                        : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{m.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded font-medium">
                            Active
                          </span>
                        )}
                        {compat && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              compat.color === 'emerald'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : compat.color === 'amber'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {compat.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {compat?.description || `${Math.round(m.size / (1024 * 1024 * 1024) * 10) / 10} GB`}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSelectModel(m.name);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          Use Model
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curated Catalog Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider text-xs mb-3">
              Curated Video-Game QA Models Catalog
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {catalog.map((cat) => {
                const installed = isModelInstalled(cat.name);
                const isPullingThis = pullingModel === cat.name;
                const compat = cat.compatibility;

                return (
                  <div
                    key={cat.name}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{cat.name}</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {cat.size_tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{cat.description}</p>
                      {compat && (
                        <div className="mt-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium inline-block ${
                              compat.color === 'emerald'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : compat.color === 'amber'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {compat.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{cat.parameters} weights</span>
                      {installed ? (
                        <span className="text-xs text-emerald-400 flex items-center space-x-1 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          <span>Installed</span>
                        </span>
                      ) : (
                        <button
                          disabled={isPullingThis}
                          onClick={() => handlePullModel(cat.name)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1 transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          <span>Install</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pull Custom Model by Name */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Pull any custom model (e.g. mistral:7b, phi4:14b)..."
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => {
                if (customModelInput.trim()) {
                  handlePullModel(customModelInput.trim());
                  setCustomModelInput('');
                }
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Pull Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
