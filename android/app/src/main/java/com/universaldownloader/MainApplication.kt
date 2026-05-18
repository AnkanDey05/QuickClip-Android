package com.universaldownloader

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLException
import com.yausername.ffmpeg.FFmpeg

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Add the YtDlp native module package
          add(YtDlpPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    
    // Initialize youtubedl-android (yt-dlp) before React Native
    try {
      YoutubeDL.getInstance().init(this)
      Log.i("UniversalDownloader", "YoutubeDL initialized successfully")
    } catch (e: YoutubeDLException) {
      Log.e("UniversalDownloader", "Failed to initialize YoutubeDL", e)
    }

    // Initialize FFmpeg (required for merging video+audio streams)
    try {
      FFmpeg.getInstance().init(this)
      Log.i("UniversalDownloader", "FFmpeg initialized successfully")
    } catch (e: Exception) {
      Log.e("UniversalDownloader", "Failed to initialize FFmpeg", e)
    }
    
    // Initialize React Native
    loadReactNative(this)
    
    Log.i("UniversalDownloader", "Application initialized successfully")
  }
}
