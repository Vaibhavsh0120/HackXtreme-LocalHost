# RunAnywhere Flutter Starter App

A comprehensive starter app demonstrating the capabilities of the [RunAnywhere SDK](https://pub.dev/packages/runanywhere) - a privacy-first, on-device AI SDK for Flutter.

![RunAnywhere](https://img.shields.io/badge/RunAnywhere-0.15.8-00D9FF)
![Flutter](https://img.shields.io/badge/Flutter-3.10+-02569B)
![Platforms](https://img.shields.io/badge/Platforms-iOS%20%7C%20Android-green)

## Features

This starter app showcases four main capabilities of the RunAnywhere SDK:

### 💬 Chat (LLM Text Generation)
- Streaming text generation with token-by-token output
- Performance metrics (tokens/second, total tokens)
- Cancel generation mid-stream
- Suggested prompts for quick testing

### 🎤 Speech-to-Text (STT)
- Real-time audio recording
- On-device transcription using Whisper models
- Audio level visualization
- Transcription history

### 🔊 Text-to-Speech (TTS)
- Neural voice synthesis with Kokoro
- Adjustable speech rate
- Sample texts for quick testing
- Audio playback controls

### 🤖 Voice Pipeline
- Full voice assistant experience
- Seamless integration: Speak → Transcribe → Generate → Speak
- Real-time status updates
- Conversation history

## Getting Started

### Prerequisites

- Flutter 3.10 or higher
- iOS 13.0+ or Android API 24+
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RunanywhereAI/flutter-starter-example.git
   cd flutter-starter-example
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Run the app**
   ```bash
   flutter run
   ```

### iOS Setup

Add the following to your `ios/Runner/Info.plist` for microphone access:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for speech recognition</string>
```

### Android Setup

Add the following permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Architecture

```
lib/
├── main.dart                 # App entry point & SDK initialization
├── services/
│   └── model_service.dart    # Model management (download, load, state)
├── theme/
│   └── app_theme.dart        # Custom dark theme with accent colors
├── views/
│   ├── home_view.dart        # Main navigation screen
│   ├── chat_view.dart        # LLM chat interface
│   ├── speech_to_text_view.dart  # STT interface
│   ├── text_to_speech_view.dart  # TTS interface
│   └── voice_pipeline_view.dart  # Voice agent interface
└── widgets/
    ├── feature_card.dart     # Home screen feature cards
    ├── model_loader_widget.dart  # Model download/load UI
    ├── chat_message_bubble.dart  # Chat message UI
    └── audio_visualizer.dart     # Audio level visualization
```

## SDK Packages

This app uses three RunAnywhere packages:

| Package | Purpose | Pub.dev |
|---------|---------|---------|
| `runanywhere` | Core SDK with infrastructure | [pub.dev/packages/runanywhere](https://pub.dev/packages/runanywhere) |
| `runanywhere_llamacpp` | LLM backend (LlamaCpp) | [pub.dev/packages/runanywhere_llamacpp](https://pub.dev/packages/runanywhere_llamacpp) |
| `runanywhere_onnx` | STT/TTS/VAD backend (ONNX) | [pub.dev/packages/runanywhere_onnx](https://pub.dev/packages/runanywhere_onnx) |

## Default Models

The app comes preconfigured with these models:

| Model | Purpose | Size |
|-------|---------|------|
| SmolLM2 360M Q8_0 | Text generation | ~400MB |
| Sherpa ONNX Whisper Tiny EN | Speech recognition | ~80MB |
| Kokoro EN v0.19 | Voice synthesis | ~100MB |

## Customization

### Using Different Models

You can modify `lib/services/model_service.dart` to use different models:

```dart
// LLM Model - Example with a larger model
LlamaCpp.addModel(
  id: 'qwen2-1.5b-q4',
  name: 'Qwen2 1.5B Q4',
  url: 'https://huggingface.co/...',
  memoryRequirement: 1500000000,
);

// STT Model - Example with multilingual support
Onnx.addModel(
  id: 'whisper-small-multi',
  name: 'Whisper Small Multilingual',
  url: 'https://...',
  modality: ModelCategory.speechRecognition,
);
```

### Theming

The app uses a custom dark theme defined in `lib/theme/app_theme.dart`. You can customize:

- `AppColors` - Color palette with accent colors
- `AppTheme.darkTheme` - Complete Material theme

## Privacy

All AI processing happens **on-device**. No data is sent to external servers. The models are downloaded once and stored locally on the device.

## Troubleshooting

### Models not downloading
- Check your internet connection
- Ensure sufficient storage space (models can be 100MB-1GB)
- Check iOS/Android permissions

### Microphone not working
- Grant microphone permission in device settings
- Restart the app after granting permission

### Low performance
- Smaller models (like SmolLM2 360M) work better on mobile devices
- Close other apps to free up memory
- Use quantized models (Q4/Q8) for better performance

## Support

- **GitHub Issues**: [Report bugs](https://github.com/RunanywhereAI/runanywhere-sdks/issues)
- **Email**: san@runanywhere.ai
- **Documentation**: [runanywhere.ai](https://runanywhere.ai)

## License

This starter app is provided under the MIT License. The RunAnywhere SDK is licensed under the [RunAnywhere License](https://runanywhere.ai/license).

For commercial licensing inquiries, contact: san@runanywhere.ai
