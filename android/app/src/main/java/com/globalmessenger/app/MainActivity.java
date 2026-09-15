package com.globalmessenger.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import java.util.concurrent.Executor;

public class MainActivity extends Activity {
    private static final String APP_URL = BuildConfig.GM_APP_URL;
    private static final String PREFS = "global_messenger_security";
    private static final String BIOMETRIC_LOCK = "biometric_lock";
    private WebView webView;
    private SharedPreferences securityPrefs;
    private boolean authenticatedThisLaunch = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFocusForKeyboard();
        securityPrefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        requestRuntimePermissions();

        webView = new WebView(this);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus(View.FOCUS_DOWN);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setLoadsImagesAutomatically(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
        webView.addJavascriptInterface(new SecurityBridge(), "GlobalMessengerSecurity");
        webView.loadUrl(APP_URL);

        if (securityPrefs.getBoolean(BIOMETRIC_LOCK, false)) {
            webView.setVisibility(View.INVISIBLE);
            webView.postDelayed(this::authenticateForApp, 250);
        }
    }

    private void requestWindowFocusForKeyboard() {
        Window window = getWindow();
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }