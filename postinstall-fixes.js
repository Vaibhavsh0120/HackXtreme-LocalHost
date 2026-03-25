const fs = require('node:fs');
const path = require('node:path');

const runAnywhereConfigs = [
  {
    name: '@runanywhere/core',
    file: 'node_modules/@runanywhere/core/react-native.config.js',
    packageImportPath:
      'import com.margelo.nitro.runanywhere.RunAnywhereCorePackage;',
    packageInstance: 'new RunAnywhereCorePackage()',
  },
  {
    name: '@runanywhere/llamacpp',
    file: 'node_modules/@runanywhere/llamacpp/react-native.config.js',
    packageImportPath:
      'import com.margelo.nitro.runanywhere.llama.RunAnywhereLlamaPackage;',
    packageInstance: 'new RunAnywhereLlamaPackage()',
  },
  {
    name: '@runanywhere/onnx',
    file: 'node_modules/@runanywhere/onnx/react-native.config.js',
    packageImportPath:
      'import com.margelo.nitro.runanywhere.onnx.RunAnywhereONNXPackage;',
    packageInstance: 'new RunAnywhereONNXPackage()',
  },
];

const androidManifestFiles = [
  'node_modules/react-native-haptic-feedback/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-live-audio-stream/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-linear-gradient/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-fs/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml',
  'node_modules/react-native-worklets-core/android/src/main/AndroidManifest.xml',
  'node_modules/@runanywhere/core/android/src/main/AndroidManifest.xml',
  'node_modules/@runanywhere/llamacpp/android/src/main/AndroidManifest.xml',
  'node_modules/@runanywhere/onnx/android/src/main/AndroidManifest.xml',
];

const sourcePatches = [
  {
    file: 'node_modules/@runanywhere/core/android/src/main/java/com/margelo/nitro/runanywhere/ArchiveUtility.kt',
    changes: [
      {
        from: 'var entry: TarArchiveEntry? = tarIn.nextTarEntry',
        to: 'var entry = tarIn.nextEntry as? TarArchiveEntry',
      },
      {
        from: 'entry = tarIn.nextTarEntry',
        to: 'entry = tarIn.nextEntry as? TarArchiveEntry',
      },
    ],
  },
  {
    file: 'node_modules/react-native-fs/android/build.gradle',
    changes: [
      {
        from: "android {\n    compileSdkVersion safeExtGet('compileSdkVersion', 26)",
        to: "android {\n    namespace 'com.rnfs'\n    compileSdkVersion safeExtGet('compileSdkVersion', 26)",
      },
    ],
  },
  {
    file: 'node_modules/react-native-live-audio-stream/android/build.gradle',
    changes: [
      {
        from: 'android {\n    compileSdkVersion safeExtGet("compileSdkVersion", DEFAULT_COMPILE_SDK_VERSION)',
        to: 'android {\n    namespace "com.imxiqi.rnliveaudiostream"\n    compileSdkVersion safeExtGet("compileSdkVersion", DEFAULT_COMPILE_SDK_VERSION)',
      },
    ],
  },
  {
    file: 'node_modules/react-native-linear-gradient/android/build.gradle',
    changes: [
      {
        from: "android {\n    compileSdkVersion safeExtGet('compileSdkVersion', 31).toInteger()",
        to: "android {\n    namespace 'com.BV.LinearGradient'\n    compileSdkVersion safeExtGet('compileSdkVersion', 31).toInteger()",
      },
    ],
  },
  {
    file: 'node_modules/react-native-worklets-core/android/build.gradle',
    changes: [
      {
        from: 'android {\n  compileSdkVersion getExtOrIntegerDefault("compileSdkVersion")',
        to: 'android {\n  namespace "com.worklets"\n  compileSdkVersion getExtOrIntegerDefault("compileSdkVersion")',
      },
    ],
  },
  {
    file: 'node_modules/@runanywhere/core/cpp/bridges/InitBridge.cpp',
    changes: [
      {
        from: '#if defined(ANDROID) || defined(__ANDROID__)\n    int androidLevel = ANDROID_LOG_INFO;',
        to: '#if defined(ANDROID) || defined(__ANDROID__)\n    (void)levelStr;\n    int androidLevel = ANDROID_LOG_INFO;',
      },
    ],
  },
  {
    file: 'node_modules/@runanywhere/core/cpp/HybridRunAnywhereCore.cpp',
    changes: [
      {
        from: 'return Promise<std::string>::async([this, path, bodyJson]() -> std::string {',
        to: 'return Promise<std::string>::async([path, bodyJson]() -> std::string {',
      },
      {
        from: '        std::string url = HTTPBridge::shared().buildURL(path);\n\n',
        to: '',
      },
      {
        from: 'return Promise<std::string>::async([this, path]() -> std::string {',
        to: 'return Promise<std::string>::async([path]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, prompt, optionsJson]() -> std::string {',
        to: 'return Promise<std::string>::async([prompt, optionsJson]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, prompt, optionsJson, callback]() -> std::string {',
        to: 'return Promise<std::string>::async([prompt, optionsJson, callback]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, prompt, schema, optionsJson]() -> std::string {',
        to: 'return Promise<std::string>::async([prompt, schema, optionsJson]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, audioBase64, sampleRate, language]() -> std::string {',
        to: 'return Promise<std::string>::async([audioBase64, sampleRate, language]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, filePath, language]() -> std::string {',
        to: 'return Promise<std::string>::async([filePath, language]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, text, voiceId, speedRate, pitchShift]() -> std::string {',
        to: 'return Promise<std::string>::async([text, voiceId, speedRate, pitchShift]() -> std::string {',
      },
      {
        from: '             result.audio_size, result.sample_rate, result.duration_ms);',
        to: '             result.audio_size, result.sample_rate, static_cast<long long>(result.duration_ms));',
      },
      {
        from: 'return Promise<std::string>::async([this, audioBase64, optionsJson]() -> std::string {',
        to: 'return Promise<std::string>::async([audioBase64, optionsJson]() -> std::string {',
      },
      {
        from: 'return Promise<bool>::async([this, configJson]() -> bool {',
        to: 'return Promise<bool>::async([configJson]() -> bool {',
      },
      {
        from: 'return Promise<bool>::async([this]() -> bool {',
        to: 'return Promise<bool>::async([]() -> bool {',
      },
      {
        from: 'return Promise<std::string>::async([this, audioBase64]() -> std::string {',
        to: 'return Promise<std::string>::async([audioBase64]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, prompt]() -> std::string {',
        to: 'return Promise<std::string>::async([prompt]() -> std::string {',
      },
      {
        from: 'return Promise<std::string>::async([this, text]() -> std::string {',
        to: 'return Promise<std::string>::async([text]() -> std::string {',
      },
    ],
  },
  {
    file: 'node_modules/@runanywhere/llamacpp/cpp/HybridRunAnywhereLlama.cpp',
    changes: [
      {
        from: 'std::string extractStringValue(const std::string& json, const std::string& key, const std::string& defaultValue = "") {',
        to: '[[maybe_unused]] std::string extractStringValue(const std::string& json, const std::string& key, const std::string& defaultValue = "") {',
      },
    ],
  },
  {
    file: 'node_modules/@runanywhere/onnx/cpp/HybridRunAnywhereONNX.cpp',
    changes: [
      {
        from: 'return Promise<std::string>::async([this, audioBase64, sampleRate, language]() {',
        to: 'return Promise<std::string>::async([audioBase64, language]() {',
      },
      {
        from: 'return Promise<std::string>::async([this, filePath, language]() {',
        to: 'return Promise<std::string>::async([filePath, language]() {',
      },
      {
        from: 'return Promise<std::string>::async([this, text, voiceId, speedRate, pitchShift]() {',
        to: 'return Promise<std::string>::async([text, voiceId, speedRate, pitchShift]() {',
      },
      {
        from: 'return Promise<std::string>::async([this, audioBase64, optionsJson]() {',
        to: 'return Promise<std::string>::async([audioBase64, optionsJson]() {',
      },
      {
        from: 'return Promise<std::string>::async([this, audioBase64]() {',
        to: 'return Promise<std::string>::async([audioBase64]() {',
      },
    ],
  },
  {
    file: 'node_modules/react-native-worklets-core/cpp/WKTJsiDispatcher.h',
    changes: [
      {
        from: '      } catch (const std::exception &err) {\n        if (onError != nullptr)\n          onError(err.what());\n      } catch (const std::runtime_error &err) {\n        if (onError != nullptr)\n          onError(err.what());',
        to: '      } catch (const std::exception &err) {\n        if (onError != nullptr)\n          onError(err.what());',
      },
    ],
  },
  {
    file: 'node_modules/react-native-worklets-core/cpp/decorators/WKTJsiSetImmediateDecorator.h',
    changes: [
      {
        from: '                  printf("ctx %lu: setImmediate\\n", context->getContextId());',
        to: '                  printf("ctx %zu: setImmediate\\n", context->getContextId());',
      },
    ],
  },
];

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n');
}

function writeText(filePath, contents, currentContents) {
  const eol = currentContents.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(filePath, contents.replace(/\n/g, eol));
}

function desiredRunAnywhereConfig({packageImportPath, packageInstance}) {
  return `module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: '${packageImportPath}',
        packageInstance: '${packageInstance}',
      },
    },
  },
};
`;
}

function normalizeFile(filePath, nextContents, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[postinstall-fixes] Skipped ${label}: file not found`);
    return;
  }

  const currentContents = fs.readFileSync(filePath, 'utf8');
  if (normalizeText(currentContents) === nextContents) {
    console.log(`[postinstall-fixes] ${label} already normalized`);
    return;
  }

  writeText(filePath, nextContents, currentContents);
  console.log(`[postinstall-fixes] Normalized ${label}`);
}

function normalizeManifest(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[postinstall-fixes] Skipped ${filePath}: file not found`);
    return;
  }

  const currentContents = fs.readFileSync(filePath, 'utf8');
  const nextContents = normalizeText(currentContents).replace(
    /<manifest([^>]*)\s+package="[^"]+"([^>]*)>/,
    '<manifest$1$2>',
  );

  if (nextContents === normalizeText(currentContents)) {
    console.log(`[postinstall-fixes] ${filePath} already normalized`);
    return;
  }

  writeText(filePath, nextContents, currentContents);
  console.log(`[postinstall-fixes] Normalized ${filePath}`);
}

function applyTextChanges(filePath, changes) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[postinstall-fixes] Skipped ${filePath}: file not found`);
    return;
  }

  const currentContents = fs.readFileSync(filePath, 'utf8');
  let nextContents = normalizeText(currentContents);
  let updated = false;

  for (const change of changes) {
    if (!nextContents.includes(change.from)) {
      continue;
    }

    nextContents = nextContents.replaceAll(change.from, change.to);
    updated = true;
  }

  if (!updated) {
    console.log(`[postinstall-fixes] ${filePath} already patched`);
    return;
  }

  writeText(filePath, nextContents, currentContents);
  console.log(`[postinstall-fixes] Patched ${filePath}`);
}

for (const config of runAnywhereConfigs) {
  normalizeFile(
    path.join(__dirname, config.file),
    desiredRunAnywhereConfig(config),
    config.name,
  );
}

for (const manifestFile of androidManifestFiles) {
  normalizeManifest(path.join(__dirname, manifestFile));
}

for (const patch of sourcePatches) {
  applyTextChanges(path.join(__dirname, patch.file), patch.changes);
}
