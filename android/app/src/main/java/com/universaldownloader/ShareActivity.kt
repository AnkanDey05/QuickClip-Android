package com.universaldownloader

import android.os.Bundle
import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class ShareActivity : ReactActivity() {

  override fun getMainComponentName(): String = "SharePopup"

  /**
   * Pass the shared URL directly as initialProps so the React component
   * can read it immediately without depending on ReceiveSharingIntent timing.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
      override fun getLaunchOptions(): Bundle? {
        val extras = Bundle()
        val intent = this@ShareActivity.intent
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
          val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
          if (sharedText != null) {
            extras.putString("sharedUrl", sharedText)
          }
        }
        return extras
      }
    }
}
