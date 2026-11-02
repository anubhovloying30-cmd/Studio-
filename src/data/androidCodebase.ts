import JSZip from 'jszip';

export interface CodeSnippet {
  filename: string;
  language: string;
  path: string;
  description: string;
  content: string;
}

export const ANDROID_FILES: CodeSnippet[] = [
  {
    filename: 'AudioEngine.h',
    language: 'cpp',
    path: 'app/src/main/cpp/AudioEngine.h',
    description: 'C++ Low-Latency Multi-track Real-time Audio Engine header with Oboe AAudio/OpenSL ES callback and atomic track buffers.',
    content: `#pragma once
#include <oboe/Oboe.h>
#include <vector>
#include <memory>
#include <atomic>
#include <string>

// DHWONI STUDIO: Native Real-time Multi-track Audio Engine
namespace dhwoni {

struct Track {
    std::string name;
    std::vector<float> samples;
    std::atomic<size_t> playbackPosition{0};
    std::atomic<float> gain{0.85f};
    std::atomic<float> pan{0.0f}; // -1.0 (L) to 1.0 (R)
    std::atomic<bool> isMuted{false};
    std::atomic<bool> isSolo{false};
};

class AudioEngine : public oboe::AudioStreamDataCallback {
public:
    AudioEngine();
    ~AudioEngine();

    bool start();
    void stop();
    void setPlaying(bool playing);
    void rewind();
    int addTrack(const std::string& name, const std::vector<float>& pcmData);
    void setTrackGain(int trackIndex, float gain);
    void setTrackPan(int trackIndex, float pan);
    void setTrackMute(int trackIndex, bool muted);
    void setBpm(int bpm);
    int getBpm() const;
    bool isPlaying() const;

    // Real-time audio stream callback executed on high-priority OS audio thread
    oboe::DataCallbackResult onAudioReady(
        oboe::AudioStream *audioStream,
        void *audioData,
        int32_t numFrames
    ) override;

private:
    std::shared_ptr<oboe::AudioStream> mStream;
    std::vector<std::unique_ptr<Track>> mTracks;
    std::atomic<bool> mIsPlaying{false};
    std::atomic<int> mBpm{120};
    static constexpr int32_t kChannelCount = 2; // Stereo output
    static constexpr int32_t kSampleRate = 48000; // Native hardware rate
};

} // namespace dhwoni
`,
  },
  {
    filename: 'AudioEngine.cpp',
    language: 'cpp',
    path: 'app/src/main/cpp/AudioEngine.cpp',
    description: 'C++ Real-time audio stream mixing with lock-free atomics and soft-clipping protection.',
    content: `#include "AudioEngine.h"
#include <android/log.h>
#include <algorithm>
#include <cmath>

#define TAG "DhwoniStudioEngine"

namespace dhwoni {

AudioEngine::AudioEngine() {}

AudioEngine::~AudioEngine() {
    stop();
}

bool AudioEngine::start() {
    oboe::AudioStreamBuilder builder;
    builder.setFormat(oboe::AudioFormat::Float)
           ->setChannelCount(kChannelCount)
           ->setSampleRate(kSampleRate)
           ->setPerformanceMode(oboe::PerformanceMode::LowLatency)
           ->setSharingMode(oboe::SharingMode::Exclusive)
           ->setDataCallback(this);

    oboe::Result result = builder.openStream(mStream);
    if (result != oboe::Result::OK) {
        __android_log_print(ANDROID_LOG_ERROR, TAG, "Failed to open Oboe stream: %s", oboe::convertToText(result));
        return false;
    }

    result = mStream->requestStart();
    __android_log_print(ANDROID_LOG_INFO, TAG, "Dhwoni Studio Oboe Engine started with buffer size: %d", mStream->getBufferSizeInFrames());
    return result == oboe::Result::OK;
}

void AudioEngine::stop() {
    if (mStream) {
        mStream->stop();
        mStream->close();
        mStream.reset();
    }
}

void AudioEngine::setPlaying(bool playing) {
    mIsPlaying.store(playing, std::memory_order_relaxed);
}

void AudioEngine::rewind() {
    for (auto& track : mTracks) {
        track->playbackPosition.store(0, std::memory_order_relaxed);
    }
}

int AudioEngine::addTrack(const std::string& name, const std::vector<float>& pcmData) {
    auto track = std::make_unique<Track>();
    track->name = name;
    track->samples = pcmData;
    mTracks.push_back(std::move(track));
    return static_cast<int>(mTracks.size() - 1);
}

void AudioEngine::setTrackGain(int trackIndex, float gain) {
    if (trackIndex >= 0 && trackIndex < static_cast<int>(mTracks.size())) {
        mTracks[trackIndex]->gain.store(std::clamp(gain, 0.0f, 1.5f), std::memory_order_relaxed);
    }
}

void AudioEngine::setTrackPan(int trackIndex, float pan) {
    if (trackIndex >= 0 && trackIndex < static_cast<int>(mTracks.size())) {
        mTracks[trackIndex]->pan.store(std::clamp(pan, -1.0f, 1.0f), std::memory_order_relaxed);
    }
}

void AudioEngine::setTrackMute(int trackIndex, bool muted) {
    if (trackIndex >= 0 && trackIndex < static_cast<int>(mTracks.size())) {
        mTracks[trackIndex]->isMuted.store(muted, std::memory_order_relaxed);
    }
}

void AudioEngine::setBpm(int bpm) {
    mBpm.store(bpm, std::memory_order_relaxed);
}

int AudioEngine::getBpm() const {
    return mBpm.load(std::memory_order_relaxed);
}

bool AudioEngine::isPlaying() const {
    return mIsPlaying.load(std::memory_order_relaxed);
}

// REAL-TIME AUDIO CALLBACK
// Golden Rules: Zero allocation, zero mutex locks, zero I/O, zero JNI calls!
oboe::DataCallbackResult AudioEngine::onAudioReady(
    oboe::AudioStream *audioStream,
    void *audioData,
    int32_t numFrames
) {
    auto *output = static_cast<float*>(audioData);
    int totalSamples = numFrames * kChannelCount;

    // Zero-out audio buffer
    std::fill(output, output + totalSamples, 0.0f);

    if (!mIsPlaying.load(std::memory_order_relaxed)) {
        return oboe::DataCallbackResult::Continue;
    }

    bool anySolo = false;
    for (const auto& track : mTracks) {
        if (track->isSolo.load(std::memory_order_relaxed)) {
            anySolo = true;
            break;
        }
    }

    // Mix tracks
    for (auto& track : mTracks) {
        if (track->isMuted.load(std::memory_order_relaxed)) continue;
        if (anySolo && !track->isSolo.load(std::memory_order_relaxed)) continue;

        float gain = track->gain.load(std::memory_order_relaxed);
        float pan = track->pan.load(std::memory_order_relaxed);
        float gainL = gain * std::clamp(1.0f - pan, 0.0f, 1.0f);
        float gainR = gain * std::clamp(1.0f + pan, 0.0f, 1.0f);

        size_t pos = track->playbackPosition.load(std::memory_order_relaxed);

        for (int frame = 0; frame < numFrames; ++frame) {
            int idxL = frame * 2;
            int idxR = frame * 2 + 1;

            if (pos < track->samples.size()) {
                float sample = track->samples[pos++];
                output[idxL] += sample * gainL;
                output[idxR] += sample * gainR;
            } else {
                break;
            }
        }
        track->playbackPosition.store(pos, std::memory_order_relaxed);
    }

    // Soft-clipping saturation (tanh) to prevent digital harsh distortion
    for (int i = 0; i < totalSamples; ++i) {
        output[i] = std::tanh(output[i] * 0.95f);
    }

    return oboe::DataCallbackResult::Continue;
}

} // namespace dhwoni
`,
  },
  {
    filename: 'native-lib.cpp',
    language: 'cpp',
    path: 'app/src/main/cpp/native-lib.cpp',
    description: 'JNI Bridge routing Kotlin calls to C++ Dhwoni Audio Engine.',
    content: `#include <jni.h>
#include "AudioEngine.h"

static dhwoni::AudioEngine* gEngine = nullptr;

extern "C" {

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_initEngine(JNIEnv *env, jobject /* this */) {
    if (!gEngine) {
        gEngine = new dhwoni::AudioEngine();
        gEngine->start();
    }
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_setPlaying(JNIEnv *env, jobject /* this */, jboolean playing) {
    if (gEngine) gEngine->setPlaying(playing);
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_rewind(JNIEnv *env, jobject /* this */) {
    if (gEngine) gEngine->rewind();
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_setTrackGain(JNIEnv *env, jobject /* this */, jint trackIndex, jfloat gain) {
    if (gEngine) gEngine->setTrackGain(trackIndex, gain);
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_setTrackPan(JNIEnv *env, jobject /* this */, jint trackIndex, jfloat pan) {
    if (gEngine) gEngine->setTrackPan(trackIndex, pan);
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_setTrackMute(JNIEnv *env, jobject /* this */, jint trackIndex, jboolean muted) {
    if (gEngine) gEngine->setTrackMute(trackIndex, muted);
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_setBpm(JNIEnv *env, jobject /* this */, jint bpm) {
    if (gEngine) gEngine->setBpm(bpm);
}

JNIEXPORT void JNICALL
Java_com_dhwoni_studio_AudioEngineBridge_destroyEngine(JNIEnv *env, jobject /* this */) {
    if (gEngine) {
        gEngine->stop();
        delete gEngine;
        gEngine = nullptr;
    }
}

}
`,
  },
  {
    filename: 'CMakeLists.txt',
    language: 'cmake',
    path: 'app/src/main/cpp/CMakeLists.txt',
    description: 'CMake configuration fetching Google Oboe v1.9.0 and compiling libdhwonistudio.so.',
    content: `cmake_minimum_required(VERSION 3.22.1)
project("dhwonistudio")

# Fetch Google Oboe C++ Library automatically from GitHub
include(FetchContent)
FetchContent_Declare(
    oboe
    GIT_REPOSITORY https://github.com/google/oboe
    GIT_TAG 1.9.0
)
FetchContent_MakeAvailable(oboe)

add_library(dhwonistudio SHARED
    native-lib.cpp
    AudioEngine.cpp
)

target_include_directories(dhwonistudio PRIVATE \${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(dhwonistudio oboe log)
`,
  },
  {
    filename: 'AudioEngineBridge.kt',
    language: 'kotlin',
    path: 'app/src/main/java/com/dhwoni/studio/AudioEngineBridge.kt',
    description: 'Kotlin JNI native wrapper object for Dhwoni Studio.',
    content: `package com.dhwoni.studio

object AudioEngineBridge {
    init {
        System.loadLibrary("dhwonistudio")
    }

    external fun initEngine()
    external fun destroyEngine()
    external fun setPlaying(playing: Boolean)
    external fun rewind()
    external fun setTrackGain(trackIndex: Int, gain: Float)
    external fun setTrackPan(trackIndex: Int, pan: Float)
    external fun setTrackMute(trackIndex: Int, muted: Boolean)
    external fun setBpm(bpm: Int)
}
`,
  },
  {
    filename: 'StudioScreen.kt',
    language: 'kotlin',
    path: 'app/src/main/java/com/dhwoni/studio/ui/StudioScreen.kt',
    description: 'Jetpack Compose Material 3 UI with timeline, mixer faders, and gold Dhwoni branding.',
    content: `package com.dhwoni.studio.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dhwoni.studio.AudioEngineBridge

val GoldAccent = Color(0xFFDFB743)
val DarkStudioBg = Color(0xFF0A0A0A)
val SurfaceDark = Color(0xFF141414)

data class TrackState(val name: String, val icon: String, var volume: Float = 0.85f, var isMuted: Boolean = false)

@Composable
fun StudioScreen() {
    var isPlaying by remember { mutableStateOf(false) }
    var bpm by remember { mutableIntStateOf(140) }
    val tracks = remember {
        mutableStateListOf(
            TrackState("Lead Vocal (ধ্বনি)", "🎙️", 0.90f),
            TrackState("808 Trap Drums", "🥁", 0.95f),
            TrackState("Sub Boom Bass", "🎹", 0.88f),
            TrackState("Acoustic / Pluck", "🎸", 0.82f)
        )
    }

    LaunchedEffect(Unit) {
        AudioEngineBridge.initEngine()
        AudioEngineBridge.setBpm(bpm)
    }

    DisposableEffect(Unit) {
        onDispose { AudioEngineBridge.destroyEngine() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("DHWONI STUDIO", color = GoldAccent, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("ধ্বনি", color = GoldAccent.copy(alpha = 0.7f), fontSize = 14.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkStudioBg)
            )
        },
        bottomBar = {
            BottomAppBar(
                containerColor = SurfaceDark,
                actions = {
                    IconButton(onClick = {
                        AudioEngineBridge.rewind()
                        isPlaying = false
                    }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Rewind", tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    FilledIconButton(
                        onClick = {
                            isPlaying = !isPlaying
                            AudioEngineBridge.setPlaying(isPlaying)
                        },
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = if (isPlaying) Color.Red else GoldAccent)
                    ) {
                        Icon(
                            if (isPlaying) Icons.Default.Stop else Icons.Default.PlayArrow,
                            contentDescription = "Play/Stop",
                            tint = Color.Black
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(DarkStudioBg)
                .padding(16.dp)
        ) {
            Text("Session: Assam Vibes (140 BPM)", color = Color.LightGray, fontSize = 13.sp)
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(tracks) { index, track ->
                    Surface(
                        color = SurfaceDark,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(track.icon, fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(track.name, color = Color.White, modifier = Modifier.width(130.dp), fontSize = 13.sp)
                            Slider(
                                value = track.volume,
                                onValueChange = {
                                    track.volume = it
                                    AudioEngineBridge.setTrackGain(index, it)
                                },
                                colors = SliderDefaults.colors(thumbColor = GoldAccent, activeTrackColor = GoldAccent),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}
`,
  },
  {
    filename: 'AndroidManifest.xml',
    language: 'xml',
    path: 'app/src/main/AndroidManifest.xml',
    description: 'Android permissions for low-latency audio hardware and microphone recording.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.dhwoni.studio">

    <!-- Low-latency audio & real-time recording permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-feature android:name="android.hardware.audio.low_latency" android:required="true" />
    <uses-feature android:name="android.hardware.audio.pro" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Dhwoni Studio"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.DhwoniStudio">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.DhwoniStudio">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
  },
  {
    filename: 'build.gradle.kts',
    language: 'kotlin',
    path: 'app/build.gradle.kts',
    description: 'Gradle configuration with NDK C++20 and Oboe dependencies.',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.dhwoni.studio"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.dhwoni.studio"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        externalNativeBuild {
            cmake {
                cppFlags("-std=c++20")
                arguments("-DANDROID_STL=c++_shared")
            }
        }
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.activity.compose)
}
`,
  },
];

export async function downloadAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  for (const file of ANDROID_FILES) {
    zip.file(file.path, file.content);
  }

  // Add README
  zip.file(
    'README.md',
    `# DHWONI STUDIO (ধ্বনি) - Android Native Audio Project

Professional Low-Latency Digital Audio Workstation for Android built with Google Oboe and Jetpack Compose.
From Golaghat, Assam.

## Quick Start
1. Open this directory in Android Studio (Ladybug / Hedgehog or newer).
2. Ensure Android NDK (v25+) and CMake (v3.22.1) are installed in SDK Manager.
3. Connect your Android device or start an emulator with API 26+.
4. Click 'Run' to compile C++ Oboe native libraries and launch Dhwoni Studio!
`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DhwoniStudio-Android-NDK-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
