package com.universaldownloader

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.*

class YtDlpModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "YtDlpModule"

    @ReactMethod
    fun getVideoInfo(url: String, promise: Promise) {
        scope.launch {
            try {
                val request = YoutubeDLRequest(url)
                request.addOption("--dump-json")
                request.addOption("--no-download")
                request.addOption("--no-playlist")
                request.addOption("--no-warnings")
                request.addOption("--no-check-certificates")

                val response = YoutubeDL.getInstance().execute(request) { progress, eta, line ->
                    // No progress tracking needed for info extraction
                }

                // Parse the JSON output from yt-dlp
                val output = response.out
                if (output.isNullOrBlank()) {
                    promise.reject("YTDLP_ERROR", "No output from yt-dlp")
                    return@launch
                }

                val json = org.json.JSONObject(output)

                // Parse formats array for real file size data
                val formatsArray = Arguments.createArray()
                val rawFormats = json.optJSONArray("formats")

                if (rawFormats != null) {
                    // Group best format per resolution height
                    data class FormatEntry(
                        val height: Int,
                        val filesize: Long,
                        val filesizeApprox: Long,
                        val ext: String,
                        val vcodec: String,
                        val acodec: String,
                        val fps: Double,
                        val tbr: Double,
                        val hasVideo: Boolean,
                        val hasAudio: Boolean
                    )

                    val byHeight = mutableMapOf<Int, FormatEntry>()
                    var bestAudio: FormatEntry? = null

                    for (i in 0 until rawFormats.length()) {
                        val fmt = rawFormats.getJSONObject(i)
                        val vcodec = fmt.optString("vcodec", "none")
                        val acodec = fmt.optString("acodec", "none")
                        val hasVideo = vcodec != "none" && vcodec.isNotBlank()
                        val hasAudio = acodec != "none" && acodec.isNotBlank()
                        val height = fmt.optInt("height", 0)
                        val filesize = fmt.optLong("filesize", 0L)
                        val filesizeApprox = fmt.optLong("filesize_approx", 0L)
                        val ext = fmt.optString("ext", "")
                        val fps = fmt.optDouble("fps", 0.0)
                        val tbr = fmt.optDouble("tbr", 0.0)

                        val entry = FormatEntry(
                            height, filesize, filesizeApprox, ext,
                            vcodec, acodec, fps, tbr, hasVideo, hasAudio
                        )

                        if (hasVideo && height > 0) {
                            val existing = byHeight[height]
                            // Decide if this format is better than the existing one
                            val dominated = if (existing == null) {
                                true
                            } else if (!existing.hasAudio && hasAudio) {
                                // Prefer combined audio+video over video-only
                                true
                            } else if (existing.hasAudio && !hasAudio) {
                                false
                            } else if (existing.ext == "mp4" && ext != "mp4") {
                                // Keep mp4 over non-mp4
                                false
                            } else if (existing.ext != "mp4" && ext == "mp4") {
                                // Prefer mp4
                                true
                            } else {
                                // Same ext preference — pick higher bitrate
                                tbr > existing.tbr
                            }
                            if (dominated) {
                                byHeight[height] = entry
                            }
                        } else if (!hasVideo && hasAudio) {
                            val existingBest = bestAudio
                            if (existingBest == null || tbr > existingBest.tbr) {
                                bestAudio = entry
                            }
                        }
                    }

                    // Sort by resolution descending
                    val sortedHeights = byHeight.keys.sortedDescending()
                    for (h in sortedHeights) {
                        val entry = byHeight[h]!!
                        val fmtMap = Arguments.createMap().apply {
                            putInt("height", h)
                            putDouble("filesize", entry.filesize.toDouble())
                            putDouble("filesizeApprox", entry.filesizeApprox.toDouble())
                            putString("ext", entry.ext)
                            putString("vcodec", entry.vcodec)
                            putString("acodec", entry.acodec)
                            putDouble("fps", entry.fps)
                            putDouble("tbr", entry.tbr)
                            putBoolean("hasVideo", true)
                            putBoolean("hasAudio", entry.hasAudio)
                        }
                        formatsArray.pushMap(fmtMap)
                    }

                    // Add best audio-only option
                    if (bestAudio != null) {
                        val audioMap = Arguments.createMap().apply {
                            putInt("height", 0)
                            putDouble("filesize", bestAudio!!.filesize.toDouble())
                            putDouble("filesizeApprox", bestAudio!!.filesizeApprox.toDouble())
                            putString("ext", bestAudio!!.ext)
                            putString("vcodec", "none")
                            putString("acodec", bestAudio!!.acodec)
                            putDouble("fps", 0.0)
                            putDouble("tbr", bestAudio!!.tbr)
                            putBoolean("hasVideo", false)
                            putBoolean("hasAudio", true)
                        }
                        formatsArray.pushMap(audioMap)
                    }
                }

                val result = Arguments.createMap().apply {
                    putString("id", json.optString("id", ""))
                    putString("title", json.optString("title", "Unknown Video"))
                    putString("thumbnail", json.optString("thumbnail", ""))
                    putDouble("duration", json.optDouble("duration", 0.0))
                    putString("uploader", json.optString("uploader", "Unknown"))
                    putArray("formats", formatsArray)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("YTDLP_ERROR", e.message ?: "Failed to get video info", e)
            }
        }
    }

    @ReactMethod
    fun download(taskId: String, url: String, outputPath: String, formatId: String?, isAudio: Boolean, promise: Promise) {
        scope.launch {
            try {
                val request = YoutubeDLRequest(url)
                request.addOption("-o", outputPath)
                request.addOption("--no-warnings")
                request.addOption("--no-check-certificates")

                if (!formatId.isNullOrBlank()) {
                    request.addOption("-f", formatId)
                } else {
                    // Default: best quality with audio
                    request.addOption("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best")
                }

                if (isAudio) {
                    // Extract and convert to MP3
                    request.addOption("--extract-audio")
                    request.addOption("--audio-format", "mp3")
                } else {
                    // Merge to mp4 when combining separate video+audio streams
                    request.addOption("--merge-output-format", "mp4")
                }

                val response = YoutubeDL.getInstance().execute(request, taskId) { progress, eta, line ->
                    val params = Arguments.createMap().apply {
                        putString("taskId", taskId)
                        putDouble("progress", progress.toDouble())
                        putDouble("eta", eta.toDouble())
                        putString("line", line ?: "")
                    }
                    sendEvent("onDownloadProgress", params)
                }

                val result = Arguments.createMap().apply {
                    putInt("exitCode", response.exitCode)
                    putString("output", response.out ?: "")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                if (e.message?.contains("Process destroyed") == true) {
                    promise.reject("YTDLP_CANCELLED", "Download cancelled")
                } else {
                    promise.reject("YTDLP_DOWNLOAD_ERROR", e.message ?: "Download failed", e)
                }
            }
        }
    }

    @ReactMethod
    fun cancelDownload(taskId: String, promise: Promise) {
        try {
            YoutubeDL.getInstance().destroyProcessById(taskId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("YTDLP_CANCEL_ERROR", e.message ?: "Failed to cancel", e)
        }
    }

    /**
     * Download a specific time section of a video.
     * Uses yt-dlp's --download-sections with ffmpeg re-encoding for precise cuts.
     * @param startSec start time in seconds
     * @param endSec end time in seconds
     */
    @ReactMethod
    fun downloadSection(
        taskId: String,
        url: String,
        outputPath: String,
        formatId: String?,
        isAudio: Boolean,
        startSec: Double,
        endSec: Double,
        promise: Promise
    ) {
        scope.launch {
            try {
                val request = YoutubeDLRequest(url)
                request.addOption("-o", outputPath)
                request.addOption("--no-warnings")
                request.addOption("--no-check-certificates")

                // Section selector: *START-END format
                val sectionSpec = "*${startSec.toLong()}-${endSec.toLong()}"
                request.addOption("--download-sections", sectionSpec)

                // Force keyframe cuts for precise trimming
                request.addOption("--force-keyframes-at-cuts")

                if (!formatId.isNullOrBlank()) {
                    request.addOption("-f", formatId)
                } else {
                    request.addOption("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best")
                }

                if (isAudio) {
                    request.addOption("--extract-audio")
                    request.addOption("--audio-format", "mp3")
                } else {
                    request.addOption("--merge-output-format", "mp4")
                }

                val response = YoutubeDL.getInstance().execute(request, taskId) { progress, eta, line ->
                    val params = Arguments.createMap().apply {
                        putString("taskId", taskId)
                        putDouble("progress", progress.toDouble())
                        putDouble("eta", eta.toDouble())
                        putString("line", line ?: "")
                    }
                    sendEvent("onDownloadProgress", params)
                }

                val result = Arguments.createMap().apply {
                    putInt("exitCode", response.exitCode)
                    putString("output", response.out ?: "")
                }
                promise.resolve(result)
            } catch (e: Exception) {
                if (e.message?.contains("Process destroyed") == true) {
                    promise.reject("YTDLP_CANCELLED", "Download cancelled")
                } else {
                    promise.reject("YTDLP_DOWNLOAD_ERROR", e.message ?: "Section download failed", e)
                }
            }
        }
    }

    @ReactMethod
    fun updateYtDlp(promise: Promise) {
        scope.launch {
            try {
                val status = YoutubeDL.getInstance().updateYoutubeDL(
                    reactApplicationContext,
                    YoutubeDL.UpdateChannel.STABLE
                )
                when (status) {
                    YoutubeDL.UpdateStatus.DONE -> promise.resolve("Updated successfully")
                    YoutubeDL.UpdateStatus.ALREADY_UP_TO_DATE -> promise.resolve("Already up to date")
                    else -> promise.resolve("Update status: $status")
                }
            } catch (e: Exception) {
                promise.reject("YTDLP_UPDATE_ERROR", e.message ?: "Update failed", e)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun openFile(filePath: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }

            val uri = androidx.core.content.FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )

            val mimeType = when {
                filePath.endsWith(".mp4") -> "video/mp4"
                filePath.endsWith(".mp3") -> "audio/mpeg"
                filePath.endsWith(".webm") -> "video/webm"
                filePath.endsWith(".mkv") -> "video/x-matroska"
                else -> "*/*"
            }

            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = android.content.Intent.createChooser(intent, "Open with")
            chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_FILE_ERROR", e.message ?: "Failed to open file", e)
        }
    }

    @ReactMethod
    fun shareFile(filePath: String, title: String, promise: Promise) {
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }

            val uri = androidx.core.content.FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )

            val mimeType = when {
                filePath.endsWith(".mp4") -> "video/mp4"
                filePath.endsWith(".mp3") -> "audio/mpeg"
                filePath.endsWith(".webm") -> "video/webm"
                filePath.endsWith(".mkv") -> "video/x-matroska"
                else -> "*/*"
            }

            val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                putExtra(android.content.Intent.EXTRA_SUBJECT, title)
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = android.content.Intent.createChooser(intent, "Share")
            chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_FILE_ERROR", e.message ?: "Failed to share file", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
