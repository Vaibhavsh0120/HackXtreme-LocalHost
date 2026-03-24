import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { RunAnywhere, SDKEnvironment, ModelCategory } from '@runanywhere/core';
import { LlamaCPP, LlamaCppProvider } from '@runanywhere/llamacpp';
import { ONNX, ONNXProvider, ModelArtifactType } from '@runanywhere/onnx';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNFS from 'react-native-fs';

export const MODEL_IDS = {
  llm: 'lfm2-350m-q8_0',
  stt: 'sherpa-onnx-whisper-tiny.en',
  tts: 'vits-piper-en_US-lessac-medium',
} as const;

type ModelKey = keyof typeof MODEL_IDS;

type ModelDefinition = {
  id: string;
  statusLabel: string;
  downloadSuccessMessage: string;
  load: (path: string) => Promise<boolean>;
  unload: () => Promise<boolean>;
  validatePath: (path: string) => Promise<{ valid: boolean; reason?: string }>;
};

const MIN_LLM_FILE_SIZE_BYTES = 1_000_000;
const RUN_ANYWHERE_MODELS_DIR = `${RNFS.DocumentDirectoryPath}/RunAnywhere/Models`;

const MODEL_DEFINITIONS: Record<ModelKey, ModelDefinition> = {
  llm: {
    id: MODEL_IDS.llm,
    statusLabel: 'Loading language model...',
    downloadSuccessMessage: 'Language model ready.',
    load: (path) => RunAnywhere.loadModel(path),
    unload: () => RunAnywhere.unloadModel(),
    validatePath: async (path) => validateLLMPath(path),
  },
  stt: {
    id: MODEL_IDS.stt,
    statusLabel: 'Loading speech recognition...',
    downloadSuccessMessage: 'Speech model ready.',
    load: (path) => RunAnywhere.loadSTTModel(path, 'whisper'),
    unload: () => RunAnywhere.unloadSTTModel(),
    validatePath: async (path) => validateSpeechModelPath(path, 'speech model'),
  },
  tts: {
    id: MODEL_IDS.tts,
    statusLabel: 'Loading voice synthesis...',
    downloadSuccessMessage: 'Voice model ready.',
    load: (path) => RunAnywhere.loadTTSModel(path, 'piper'),
    unload: () => RunAnywhere.unloadTTSModel(),
    validatePath: async (path) => validateSpeechModelPath(path, 'voice model'),
  },
};

let sdkBootstrapPromise: Promise<void> | null = null;

const extractErrorCode = (error: unknown): number | null => {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/(-\d+)/);
  return match ? Number(match[1]) : null;
};

const describeModelLoadError = (modelKey: ModelKey, error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  const code = extractErrorCode(error);

  if (code === -422) {
    return `${MODEL_DEFINITIONS[modelKey].id} could not find a capable native provider. Ensure RunAnywhere is initialized and ${modelKey === 'llm' ? 'LlamaCppProvider' : 'ONNXProvider'} is registered before loading.`;
  }

  if (code === -114) {
    return `${MODEL_DEFINITIONS[modelKey].id} has an invalid model format.`;
  }

  if (code === -115) {
    return `${MODEL_DEFINITIONS[modelKey].id} storage looks corrupted. Delete and re-download the model.`;
  }

  if (code === -111) {
    return `${MODEL_DEFINITIONS[modelKey].id} failed native model loading. Check the extracted files and device memory.`;
  }

  return `${MODEL_DEFINITIONS[modelKey].id} load failed: ${message}`;
};

const uniqueTruthyPaths = (paths: Array<string | null | undefined>): string[] => {
  return [...new Set(paths.filter((path): path is string => Boolean(path && path.trim())))];
};

const listFilesRecursively = async (dirPath: string): Promise<string[]> => {
  try {
    const entries = await RNFS.readDir(dirPath);
    const nestedFiles = await Promise.all(
      entries.map(async (entry) => {
        if (entry.isFile()) {
          return [entry.path];
        }
        if (entry.isDirectory()) {
          return listFilesRecursively(entry.path);
        }
        return [];
      })
    );

    return nestedFiles.flat();
  } catch {
    return [];
  }
};

const validateLLMPath = async (path: string): Promise<{ valid: boolean; reason?: string }> => {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) {
      return { valid: false, reason: 'Model file does not exist.' };
    }

    const stats = await RNFS.stat(path);
    if (!stats.isFile()) {
      return { valid: false, reason: 'LLM path is not a file.' };
    }

    const size = Number(stats.size);
    if (!Number.isFinite(size) || size < MIN_LLM_FILE_SIZE_BYTES) {
      return { valid: false, reason: 'LLM file is missing or too small to be valid.' };
    }

    if (!path.toLowerCase().endsWith('.gguf') && !path.toLowerCase().endsWith('.bin')) {
      return { valid: false, reason: 'LLM file does not look like a GGUF/BIN model.' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Failed to inspect model file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const validateSpeechModelPath = async (
  path: string,
  label: string
): Promise<{ valid: boolean; reason?: string }> => {
  try {
    const exists = await RNFS.exists(path);
    if (!exists) {
      return { valid: false, reason: `${label} path does not exist.` };
    }

    const stats = await RNFS.stat(path);
    if (stats.isFile()) {
      if (!path.toLowerCase().endsWith('.onnx')) {
        return { valid: false, reason: `${label} file is not an ONNX artifact.` };
      }
      return { valid: true };
    }

    const files = await listFilesRecursively(path);
    const hasOnnx = files.some((file) => file.toLowerCase().endsWith('.onnx'));

    if (!hasOnnx) {
      return { valid: false, reason: `${label} directory does not contain extracted .onnx files.` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Failed to inspect ${label}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const resolveModelPath = async (modelKey: ModelKey): Promise<{ path: string | null; reason?: string }> => {
  const definition = MODEL_DEFINITIONS[modelKey];
  const modelInfo = await RunAnywhere.getModelInfo(definition.id);
  const registryPath = await RunAnywhere.getModelPath(definition.id);
  const candidatePaths = uniqueTruthyPaths([modelInfo?.localPath, registryPath]);

  for (const candidatePath of candidatePaths) {
    const validation = await definition.validatePath(candidatePath);
    if (validation.valid) {
      return { path: candidatePath };
    }
  }

  const reportedDownloaded = Boolean(modelInfo?.isDownloaded) || (await RunAnywhere.isModelDownloaded(definition.id));

  if (reportedDownloaded && candidatePaths.length > 0) {
    const lastCandidate = candidatePaths[candidatePaths.length - 1];
    const validation = await definition.validatePath(lastCandidate);
    return {
      path: null,
      reason: validation.reason ?? 'Downloaded model failed validation.',
    };
  }

  return { path: null };
};

const isDownloadedAndValid = async (modelKey: ModelKey): Promise<boolean> => {
  const result = await resolveModelPath(modelKey);
  return Boolean(result.path);
};

const setDownloadProgressForKey = (
  key: ModelKey,
  value: number,
  setters: Record<ModelKey, React.Dispatch<React.SetStateAction<number>>>
) => {
  setters[key](value);
};

const setDownloadedFlagForKey = (
  key: ModelKey,
  value: boolean,
  setters: Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>
) => {
  setters[key](value);
};

const setLoadedFlagForKey = (
  key: ModelKey,
  value: boolean,
  setters: Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>
) => {
  setters[key](value);
};

const setLoadingFlagForKey = (
  key: ModelKey,
  value: boolean,
  setters: Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>
) => {
  setters[key](value);
};

const setDownloadingFlagForKey = (
  key: ModelKey,
  value: boolean,
  setters: Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>
) => {
  setters[key](value);
};

export const registerDefaultModels = async () => {
  await LlamaCPP.addModel({
    id: MODEL_IDS.llm,
    name: 'LiquidAI LFM2 350M Q8_0',
    url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q8_0.gguf',
    memoryRequirement: 400_000_000,
  });

  await LlamaCPP.addModel({
    id: 'smollm2-360m-q8_0',
    name: 'SmolLM2 360M Q8_0',
    url: 'https://huggingface.co/prithivMLmods/SmolLM2-360M-GGUF/resolve/main/SmolLM2-360M.Q8_0.gguf',
    memoryRequirement: 500_000_000,
  });

  await ONNX.addModel({
    id: MODEL_IDS.stt,
    name: 'Sherpa Whisper Tiny (ONNX)',
    url: 'https://github.com/RunanywhereAI/sherpa-onnx/releases/download/runanywhere-models-v1/sherpa-onnx-whisper-tiny.en.tar.gz',
    modality: ModelCategory.SpeechRecognition,
    artifactType: ModelArtifactType.TarGzArchive,
    memoryRequirement: 75_000_000,
  });

  await ONNX.addModel({
    id: MODEL_IDS.tts,
    name: 'Piper TTS (US English - Medium)',
    url: 'https://github.com/RunanywhereAI/sherpa-onnx/releases/download/runanywhere-models-v1/vits-piper-en_US-lessac-medium.tar.gz',
    modality: ModelCategory.SpeechSynthesis,
    artifactType: ModelArtifactType.TarGzArchive,
    memoryRequirement: 65_000_000,
  });
};

export const ensureRunAnywhereSDKReady = async (): Promise<void> => {
  if (sdkBootstrapPromise) {
    return sdkBootstrapPromise;
  }

  sdkBootstrapPromise = (async () => {
    if (!RunAnywhere.isSDKInitialized && !(await RunAnywhere.isInitialized())) {
      await RunAnywhere.initialize({
        environment: SDKEnvironment.Development,
      });
    }

    const [llmRegistered, onnxRegistered] = await Promise.all([
      LlamaCppProvider.register(),
      ONNXProvider.register(),
    ]);

    if (!llmRegistered) {
      throw new Error('LlamaCppProvider failed to register.');
    }

    if (!onnxRegistered) {
      throw new Error('ONNXProvider failed to register.');
    }

    await registerDefaultModels();
  })().catch((error) => {
    sdkBootstrapPromise = null;
    throw error;
  });

  return sdkBootstrapPromise;
};

interface ModelServiceState {
  isLLMDownloading: boolean;
  isSTTDownloading: boolean;
  isTTSDownloading: boolean;
  isLLMDownloaded: boolean;
  isSTTDownloaded: boolean;
  isTTSDownloaded: boolean;

  llmDownloadProgress: number;
  sttDownloadProgress: number;
  ttsDownloadProgress: number;

  isLLMLoading: boolean;
  isSTTLoading: boolean;
  isTTSLoading: boolean;

  isLLMLoaded: boolean;
  isSTTLoaded: boolean;
  isTTSLoaded: boolean;

  isVoiceAgentReady: boolean;
  isInitializing: boolean;
  initializationStatus: string;

  downloadAndLoadLLM: () => Promise<void>;
  downloadAndLoadSTT: () => Promise<void>;
  downloadAndLoadTTS: () => Promise<void>;
  downloadAndLoadAllModels: () => Promise<void>;
  deleteLLM: () => Promise<void>;
  deleteSTT: () => Promise<void>;
  deleteTTS: () => Promise<void>;
  deleteAllModels: () => Promise<void>;
  unloadAllModels: () => Promise<void>;
  autoLoadDownloadedModels: () => Promise<void>;
  refreshModelStates: () => Promise<void>;
}

const ModelServiceContext = createContext<ModelServiceState | null>(null);

export const useModelService = () => {
  const context = useContext(ModelServiceContext);
  if (!context) {
    throw new Error('useModelService must be used within ModelServiceProvider');
  }
  return context;
};

interface ModelServiceProviderProps {
  children: React.ReactNode;
}

export const ModelServiceProvider: React.FC<ModelServiceProviderProps> = ({ children }) => {
  const [isLLMDownloading, setIsLLMDownloading] = useState(false);
  const [isSTTDownloading, setIsSTTDownloading] = useState(false);
  const [isTTSDownloading, setIsTTSDownloading] = useState(false);

  const [isLLMDownloaded, setIsLLMDownloaded] = useState(false);
  const [isSTTDownloaded, setIsSTTDownloaded] = useState(false);
  const [isTTSDownloaded, setIsTTSDownloaded] = useState(false);

  const [llmDownloadProgress, setLLMDownloadProgress] = useState(0);
  const [sttDownloadProgress, setSTTDownloadProgress] = useState(0);
  const [ttsDownloadProgress, setTTSDownloadProgress] = useState(0);

  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  const [isLLMLoaded, setIsLLMLoaded] = useState(false);
  const [isSTTLoaded, setIsSTTLoaded] = useState(false);
  const [isTTSLoaded, setIsTTSLoaded] = useState(false);

  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState('');

  const isVoiceAgentReady = isLLMLoaded && isSTTLoaded && isTTSLoaded;

  const downloadProgressSetters = {
    llm: setLLMDownloadProgress,
    stt: setSTTDownloadProgress,
    tts: setTTSDownloadProgress,
  } satisfies Record<ModelKey, React.Dispatch<React.SetStateAction<number>>>;

  const downloadedFlagSetters = {
    llm: setIsLLMDownloaded,
    stt: setIsSTTDownloaded,
    tts: setIsTTSDownloaded,
  } satisfies Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>;

  const loadedFlagSetters = {
    llm: setIsLLMLoaded,
    stt: setIsSTTLoaded,
    tts: setIsTTSLoaded,
  } satisfies Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>;

  const loadingFlagSetters = {
    llm: setIsLLMLoading,
    stt: setIsSTTLoading,
    tts: setIsTTSLoading,
  } satisfies Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>;

  const downloadingFlagSetters = {
    llm: setIsLLMDownloading,
    stt: setIsSTTDownloading,
    tts: setIsTTSDownloading,
  } satisfies Record<ModelKey, React.Dispatch<React.SetStateAction<boolean>>>;

  const refreshModelStates = useCallback(async () => {
    try {
      await ensureRunAnywhereSDKReady();

      const [llmDownloaded, sttDownloaded, ttsDownloaded, llmLoaded, sttLoaded, ttsLoaded] = await Promise.all([
        isDownloadedAndValid('llm'),
        isDownloadedAndValid('stt'),
        isDownloadedAndValid('tts'),
        RunAnywhere.isModelLoaded(),
        RunAnywhere.isSTTModelLoaded(),
        RunAnywhere.isTTSModelLoaded(),
      ]);

      setIsLLMDownloaded(llmDownloaded);
      setIsSTTDownloaded(sttDownloaded);
      setIsTTSDownloaded(ttsDownloaded);
      setIsLLMLoaded(llmLoaded);
      setIsSTTLoaded(sttLoaded);
      setIsTTSLoaded(ttsLoaded);
    } catch (error) {
      console.error('Failed to refresh model states:', error);
    }
  }, []);

  useEffect(() => {
    refreshModelStates().catch(() => {});
  }, [refreshModelStates]);

  const loadExistingModel = useCallback(
    async (modelKey: ModelKey) => {
      await ensureRunAnywhereSDKReady();

      const definition = MODEL_DEFINITIONS[modelKey];
      const resolvedPath = await resolveModelPath(modelKey);

      if (!resolvedPath.path) {
        throw new Error(
          resolvedPath.reason ??
            `${definition.id} is not available on disk. Delete and download the model again.`
        );
      }

      const loaded = await definition.load(resolvedPath.path);
      if (!loaded) {
        throw new Error(`${definition.id} native loader returned false.`);
      }

      return resolvedPath.path;
    },
    []
  );

  const downloadAndLoadModel = useCallback(
    async (modelKey: ModelKey) => {
      const definition = MODEL_DEFINITIONS[modelKey];

      setDownloadingFlagForKey(modelKey, false, downloadingFlagSetters);
      setLoadingFlagForKey(modelKey, false, loadingFlagSetters);

      try {
        await ensureRunAnywhereSDKReady();

        let resolvedPath = await resolveModelPath(modelKey);

        if (!resolvedPath.path) {
          setDownloadingFlagForKey(modelKey, true, downloadingFlagSetters);
          setDownloadProgressForKey(modelKey, 0, downloadProgressSetters);

          await RunAnywhere.downloadModel(definition.id, (progress) => {
            setDownloadProgressForKey(modelKey, progress.progress * 100, downloadProgressSetters);
          });

          ReactNativeHapticFeedback.trigger('notificationSuccess', {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });

          resolvedPath = await resolveModelPath(modelKey);
          if (!resolvedPath.path) {
            throw new Error(
              resolvedPath.reason ??
                `${definition.id} downloaded, but the extracted artifact is missing or invalid.`
            );
          }
        }

        setDownloadingFlagForKey(modelKey, false, downloadingFlagSetters);
        setLoadingFlagForKey(modelKey, true, loadingFlagSetters);

        await loadExistingModel(modelKey);

        setLoadedFlagForKey(modelKey, true, loadedFlagSetters);
        setDownloadedFlagForKey(modelKey, true, downloadedFlagSetters);
        setDownloadProgressForKey(modelKey, 100, downloadProgressSetters);
      } catch (error) {
        setLoadedFlagForKey(modelKey, false, loadedFlagSetters);
        console.error(`${definition.id} download/load error:`, describeModelLoadError(modelKey, error), error);
        throw error;
      } finally {
        setDownloadingFlagForKey(modelKey, false, downloadingFlagSetters);
        setLoadingFlagForKey(modelKey, false, loadingFlagSetters);
        await refreshModelStates();
      }
    },
    [
      downloadProgressSetters,
      downloadedFlagSetters,
      downloadingFlagSetters,
      loadingFlagSetters,
      loadedFlagSetters,
      refreshModelStates,
      loadExistingModel,
    ]
  );

  const deleteModel = useCallback(
    async (modelKey: ModelKey) => {
      const definition = MODEL_DEFINITIONS[modelKey];

      try {
        await ensureRunAnywhereSDKReady();
        await definition.unload();
      } catch (error) {
        console.error(`Failed to unload ${definition.id} before delete:`, error);
      }

      try {
        await RunAnywhere.deleteModel(definition.id);
      } catch (error) {
        console.error(`RunAnywhere.deleteModel failed for ${definition.id}:`, error);
      }

      setLoadedFlagForKey(modelKey, false, loadedFlagSetters);
      setDownloadedFlagForKey(modelKey, false, downloadedFlagSetters);
      setDownloadProgressForKey(modelKey, 0, downloadProgressSetters);

      await refreshModelStates();
    },
    [downloadProgressSetters, downloadedFlagSetters, loadedFlagSetters, refreshModelStates]
  );

  const downloadAndLoadLLM = useCallback(async () => {
    if (isLLMDownloading || isLLMLoading) {
      return;
    }
    await downloadAndLoadModel('llm');
  }, [downloadAndLoadModel, isLLMDownloading, isLLMLoading]);

  const downloadAndLoadSTT = useCallback(async () => {
    if (isSTTDownloading || isSTTLoading) {
      return;
    }
    await downloadAndLoadModel('stt');
  }, [downloadAndLoadModel, isSTTDownloading, isSTTLoading]);

  const downloadAndLoadTTS = useCallback(async () => {
    if (isTTSDownloading || isTTSLoading) {
      return;
    }
    await downloadAndLoadModel('tts');
  }, [downloadAndLoadModel, isTTSDownloading, isTTSLoading]);

  const downloadAndLoadAllModels = useCallback(async () => {
    await downloadAndLoadLLM();
    await downloadAndLoadSTT();
    await downloadAndLoadTTS();
  }, [downloadAndLoadLLM, downloadAndLoadSTT, downloadAndLoadTTS]);

  const deleteLLM = useCallback(async () => {
    await deleteModel('llm');
  }, [deleteModel]);

  const deleteSTT = useCallback(async () => {
    await deleteModel('stt');
  }, [deleteModel]);

  const deleteTTS = useCallback(async () => {
    await deleteModel('tts');
  }, [deleteModel]);

  const deleteAllModels = useCallback(async () => {
    await deleteLLM();
    await deleteSTT();
    await deleteTTS();
  }, [deleteLLM, deleteSTT, deleteTTS]);

  const unloadAllModels = useCallback(async () => {
    try {
      await Promise.all([
        RunAnywhere.unloadModel(),
        RunAnywhere.unloadSTTModel(),
        RunAnywhere.unloadTTSModel(),
      ]);
    } catch (error) {
      console.error('Error unloading models:', error);
    } finally {
      setIsLLMLoaded(false);
      setIsSTTLoaded(false);
      setIsTTSLoaded(false);
    }
  }, []);

  const autoLoadDownloadedModels = useCallback(async () => {
    setIsInitializing(true);
    setInitializationStatus('Preparing AI backends...');

    try {
      await ensureRunAnywhereSDKReady();

      for (const modelKey of ['llm', 'stt', 'tts'] as const) {
        const definition = MODEL_DEFINITIONS[modelKey];
        const resolvedPath = await resolveModelPath(modelKey);

        if (!resolvedPath.path) {
          setDownloadedFlagForKey(modelKey, false, downloadedFlagSetters);
          setLoadedFlagForKey(modelKey, false, loadedFlagSetters);
          continue;
        }

        setInitializationStatus(definition.statusLabel);
        setDownloadedFlagForKey(modelKey, true, downloadedFlagSetters);

        try {
          setLoadingFlagForKey(modelKey, true, loadingFlagSetters);
          await loadExistingModel(modelKey);
          setLoadedFlagForKey(modelKey, true, loadedFlagSetters);
        } catch (error) {
          setLoadedFlagForKey(modelKey, false, loadedFlagSetters);
          console.error(`Auto-load ${modelKey.toUpperCase()} failed:`, describeModelLoadError(modelKey, error), error);
        } finally {
          setLoadingFlagForKey(modelKey, false, loadingFlagSetters);
        }
      }

      setInitializationStatus('Ready');
    } catch (error) {
      console.error('Auto-load error:', error);
      setInitializationStatus('Ready');
    } finally {
      setIsInitializing(false);
      await refreshModelStates();
    }
  }, [
    downloadedFlagSetters,
    loadedFlagSetters,
    loadingFlagSetters,
    refreshModelStates,
    loadExistingModel,
  ]);

  const value: ModelServiceState = {
    isLLMDownloading,
    isSTTDownloading,
    isTTSDownloading,
    isLLMDownloaded,
    isSTTDownloaded,
    isTTSDownloaded,
    llmDownloadProgress,
    sttDownloadProgress,
    ttsDownloadProgress,
    isLLMLoading,
    isSTTLoading,
    isTTSLoading,
    isLLMLoaded,
    isSTTLoaded,
    isTTSLoaded,
    isVoiceAgentReady,
    isInitializing,
    initializationStatus,
    downloadAndLoadLLM,
    downloadAndLoadSTT,
    downloadAndLoadTTS,
    downloadAndLoadAllModels,
    deleteLLM,
    deleteSTT,
    deleteTTS,
    deleteAllModels,
    unloadAllModels,
    autoLoadDownloadedModels,
    refreshModelStates,
  };

  return (
    <ModelServiceContext.Provider value={value}>
      {children}
    </ModelServiceContext.Provider>
  );
};

export const getModelStorageDirectory = () => RUN_ANYWHERE_MODELS_DIR;
