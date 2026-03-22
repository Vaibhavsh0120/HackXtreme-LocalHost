import React, { createContext, useContext, useState, useCallback } from 'react';
import { RunAnywhere, ModelCategory } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';
import { ONNX, ModelArtifactType } from '@runanywhere/onnx';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNFS from 'react-native-fs';

const MODEL_PATHS_FILE = `${RNFS.DocumentDirectoryPath}/runanywhere_models.json`;

const getSavedModelPaths = async () => {
  try {
    if (await RNFS.exists(MODEL_PATHS_FILE)) {
      const content = await RNFS.readFile(MODEL_PATHS_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading model paths:', e);
  }
  return {};
};

const saveModelPath = async (id: string, path: string) => {
  try {
    const data = await getSavedModelPaths();
    data[id] = path;
    await RNFS.writeFile(MODEL_PATHS_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error('Error saving model path:', e);
  }
};

// Model IDs - matching sample app model registry
// See: /Users/shubhammalhotra/Desktop/test-fresh/runanywhere-sdks/examples/react-native/RunAnywhereAI/App.tsx
const MODEL_IDS = {
  llm: 'lfm2-350m-q8_0', // LiquidAI LFM2 - fast and efficient
  stt: 'sherpa-onnx-whisper-tiny.en',
  tts: 'vits-piper-en_US-lessac-medium',
} as const;

interface ModelServiceState {
  // Download state
  isLLMDownloading: boolean;
  isSTTDownloading: boolean;
  isTTSDownloading: boolean;
  isLLMDownloaded: boolean;
  isSTTDownloaded: boolean;
  isTTSDownloaded: boolean;
  
  llmDownloadProgress: number;
  sttDownloadProgress: number;
  ttsDownloadProgress: number;
  
  // Load state
  isLLMLoading: boolean;
  isSTTLoading: boolean;
  isTTSLoading: boolean;
  
  // Loaded state
  isLLMLoaded: boolean;
  isSTTLoaded: boolean;
  isTTSLoaded: boolean;
  
  isVoiceAgentReady: boolean;
  
  // Actions
  downloadAndLoadLLM: () => Promise<void>;
  downloadAndLoadSTT: () => Promise<void>;
  downloadAndLoadTTS: () => Promise<void>;
  downloadAndLoadAllModels: () => Promise<void>;
  unloadAllModels: () => Promise<void>;
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
  // Download state
  const [isLLMDownloading, setIsLLMDownloading] = useState(false);
  const [isSTTDownloading, setIsSTTDownloading] = useState(false);
  const [isTTSDownloading, setIsTTSDownloading] = useState(false);
  
  const [isLLMDownloaded, setIsLLMDownloaded] = useState(false);
  const [isSTTDownloaded, setIsSTTDownloaded] = useState(false);
  const [isTTSDownloaded, setIsTTSDownloaded] = useState(false);
  
  const [llmDownloadProgress, setLLMDownloadProgress] = useState(0);
  const [sttDownloadProgress, setSTTDownloadProgress] = useState(0);
  const [ttsDownloadProgress, setTTSDownloadProgress] = useState(0);
  
  // Load state
  const [isLLMLoading, setIsLLMLoading] = useState(false);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  
  // Loaded state
  const [isLLMLoaded, setIsLLMLoaded] = useState(false);
  const [isSTTLoaded, setIsSTTLoaded] = useState(false);
  const [isTTSLoaded, setIsTTSLoaded] = useState(false);
  
  const isVoiceAgentReady = isLLMLoaded && isSTTLoaded && isTTSLoaded;
  
  // Check if model is downloaded by looking at our persisted JSON and RNFS.exists
  const checkModelDownloaded = useCallback(async (modelId: string): Promise<boolean> => {
    try {
      const savedPaths = await getSavedModelPaths();
      const path = savedPaths[modelId];
      if (path && (await RNFS.exists(path))) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    const initChecks = async () => {
      setIsLLMDownloaded(await checkModelDownloaded(MODEL_IDS.llm));
      setIsSTTDownloaded(await checkModelDownloaded(MODEL_IDS.stt));
      setIsTTSDownloaded(await checkModelDownloaded(MODEL_IDS.tts));
    };
    initChecks();
  }, [checkModelDownloaded]);
  
  // Download and load LLM
  const downloadAndLoadLLM = useCallback(async () => {
    if (isLLMDownloading || isLLMLoading) return;
    
    try {
      const isDownloaded = await checkModelDownloaded(MODEL_IDS.llm);
      
      let localPathToLoad: string | undefined;

      if (!isDownloaded) {
        setIsLLMDownloading(true);
        setLLMDownloadProgress(0);
        
        // Download with progress (per docs: progress.progress is 0-1)
        await RunAnywhere.downloadModel(MODEL_IDS.llm, (progress) => {
          setLLMDownloadProgress(progress.progress * 100);
        });
        
        setIsLLMDownloading(false);
        ReactNativeHapticFeedback.trigger('notificationSuccess', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });

        const newInfo = await RunAnywhere.getModelInfo(MODEL_IDS.llm);
        if (newInfo?.localPath) {
          await saveModelPath(MODEL_IDS.llm, newInfo.localPath);
          localPathToLoad = newInfo.localPath;
        }
      } else {
        const savedPaths = await getSavedModelPaths();
        localPathToLoad = savedPaths[MODEL_IDS.llm];
      }
      
      // Load the model
      setIsLLMLoading(true);
      if (localPathToLoad) {
        await RunAnywhere.loadModel(localPathToLoad);
        setIsLLMLoaded(true);
        setIsLLMDownloaded(true);
      }
      setIsLLMLoading(false);
    } catch (error) {
      console.error('LLM download/load error:', error);
      setIsLLMDownloading(false);
      setIsLLMLoading(false);
    }
  }, [isLLMDownloading, isLLMLoading, checkModelDownloaded]);
  
  // Download and load STT
  const downloadAndLoadSTT = useCallback(async () => {
    if (isSTTDownloading || isSTTLoading) return;
    
    try {
      const isDownloaded = await checkModelDownloaded(MODEL_IDS.stt);
      
      let localPathToLoad: string | undefined;

      if (!isDownloaded) {
        setIsSTTDownloading(true);
        setSTTDownloadProgress(0);
        
        await RunAnywhere.downloadModel(MODEL_IDS.stt, (progress) => {
          setSTTDownloadProgress(progress.progress * 100);
        });
        
        setIsSTTDownloading(false);
        ReactNativeHapticFeedback.trigger('notificationSuccess', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });

        const newInfo = await RunAnywhere.getModelInfo(MODEL_IDS.stt);
        if (newInfo?.localPath) {
          await saveModelPath(MODEL_IDS.stt, newInfo.localPath);
          localPathToLoad = newInfo.localPath;
        }
      } else {
        const savedPaths = await getSavedModelPaths();
        localPathToLoad = savedPaths[MODEL_IDS.stt];
      }
      
      // Load the STT model
      setIsSTTLoading(true);
      if (localPathToLoad) {
        await RunAnywhere.loadSTTModel(localPathToLoad, 'whisper');
        setIsSTTLoaded(true);
        setIsSTTDownloaded(true);
      }
      setIsSTTLoading(false);
    } catch (error) {
      console.error('STT download/load error:', error);
      setIsSTTDownloading(false);
      setIsSTTLoading(false);
    }
  }, [isSTTDownloading, isSTTLoading, checkModelDownloaded]);
  
  // Download and load TTS
  const downloadAndLoadTTS = useCallback(async () => {
    if (isTTSDownloading || isTTSLoading) return;
    
    try {
      const isDownloaded = await checkModelDownloaded(MODEL_IDS.tts);
      
      let localPathToLoad: string | undefined;

      if (!isDownloaded) {
        setIsTTSDownloading(true);
        setTTSDownloadProgress(0);
        
        await RunAnywhere.downloadModel(MODEL_IDS.tts, (progress) => {
          setTTSDownloadProgress(progress.progress * 100);
        });
        
        setIsTTSDownloading(false);
        ReactNativeHapticFeedback.trigger('notificationSuccess', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });

        const newInfo = await RunAnywhere.getModelInfo(MODEL_IDS.tts);
        if (newInfo?.localPath) {
          await saveModelPath(MODEL_IDS.tts, newInfo.localPath);
          localPathToLoad = newInfo.localPath;
        }
      } else {
        const savedPaths = await getSavedModelPaths();
        localPathToLoad = savedPaths[MODEL_IDS.tts];
      }
      
      // Load the TTS model
      setIsTTSLoading(true);
      if (localPathToLoad) {
        await RunAnywhere.loadTTSModel(localPathToLoad, 'piper');
        setIsTTSLoaded(true);
        setIsTTSDownloaded(true);
      }
      setIsTTSLoading(false);
    } catch (error) {
      console.error('TTS download/load error:', error);
      setIsTTSDownloading(false);
      setIsTTSLoading(false);
    }
  }, [isTTSDownloading, isTTSLoading, checkModelDownloaded]);
  
  // Download and load all models
  const downloadAndLoadAllModels = useCallback(async () => {
    await Promise.all([
      downloadAndLoadLLM(),
      downloadAndLoadSTT(),
      downloadAndLoadTTS(),
    ]);
  }, [downloadAndLoadLLM, downloadAndLoadSTT, downloadAndLoadTTS]);
  
  // Unload all models
  const unloadAllModels = useCallback(async () => {
    try {
      await RunAnywhere.unloadModel();
      await RunAnywhere.unloadSTTModel();
      await RunAnywhere.unloadTTSModel();
      setIsLLMLoaded(false);
      setIsSTTLoaded(false);
      setIsTTSLoaded(false);
    } catch (error) {
      console.error('Error unloading models:', error);
    }
  }, []);
  
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
    downloadAndLoadLLM,
    downloadAndLoadSTT,
    downloadAndLoadTTS,
    downloadAndLoadAllModels,
    unloadAllModels,
  };
  
  return (
    <ModelServiceContext.Provider value={value}>
      {children}
    </ModelServiceContext.Provider>
  );
};

/**
 * Register default models with the SDK
 * Models match the sample app: /Users/shubhammalhotra/Desktop/test-fresh/runanywhere-sdks/examples/react-native/RunAnywhereAI/App.tsx
 */
export const registerDefaultModels = async () => {
  // LLM Model - LiquidAI LFM2 350M (fast, efficient, great for mobile)
  await LlamaCPP.addModel({
    id: MODEL_IDS.llm,
    name: 'LiquidAI LFM2 350M Q8_0',
    url: 'https://huggingface.co/LiquidAI/LFM2-350M-GGUF/resolve/main/LFM2-350M-Q8_0.gguf',
    memoryRequirement: 400_000_000,
  });
  
  // Also add SmolLM2 as alternative smaller model
  await LlamaCPP.addModel({
    id: 'smollm2-360m-q8_0',
    name: 'SmolLM2 360M Q8_0',
    url: 'https://huggingface.co/prithivMLmods/SmolLM2-360M-GGUF/resolve/main/SmolLM2-360M.Q8_0.gguf',
    memoryRequirement: 500_000_000,
  });
  
  // STT Model - Sherpa Whisper Tiny English
  // Using tar.gz from RunanywhereAI/sherpa-onnx for fast native extraction
  await ONNX.addModel({
    id: MODEL_IDS.stt,
    name: 'Sherpa Whisper Tiny (ONNX)',
    url: 'https://github.com/RunanywhereAI/sherpa-onnx/releases/download/runanywhere-models-v1/sherpa-onnx-whisper-tiny.en.tar.gz',
    modality: ModelCategory.SpeechRecognition,
    artifactType: ModelArtifactType.TarGzArchive,
    memoryRequirement: 75_000_000,
  });
  
  // TTS Model - Piper TTS (US English - Medium quality)
  await ONNX.addModel({
    id: MODEL_IDS.tts,
    name: 'Piper TTS (US English - Medium)',
    url: 'https://github.com/RunanywhereAI/sherpa-onnx/releases/download/runanywhere-models-v1/vits-piper-en_US-lessac-medium.tar.gz',
    modality: ModelCategory.SpeechSynthesis,
    artifactType: ModelArtifactType.TarGzArchive,
    memoryRequirement: 65_000_000,
  });
};
