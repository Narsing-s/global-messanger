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
    private static final String APP_URL = "https://global-messanger.onrender.com/";
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

    private boolean biometricAvailable() {
        BiometricManager manager = BiometricManager.from(this);
        int result = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK);
        return result == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private void authenticateForApp() {
        if (!biometricAvailable()) {
            securityPrefs.edit().putBoolean(BIOMETRIC_LOCK, false).apply();
            webView.setVisibility(View.VISIBLE);
            webView.requestFocus(View.FOCUS_DOWN);
            return;
        }
        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt prompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                authenticatedThisLaunch = true;
                webView.setVisibility(View.VISIBLE);
                webView.requestFocus(View.FOCUS_DOWN);
            }
            @Override public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                    Toast.makeText(MainActivity.this, "Biometric authentication is required to open Global Messenger.", Toast.LENGTH_SHORT).show();
                }
                webView.postDelayed(MainActivity.this::authenticateForApp, 600);
            }
            @Override public void onAuthenticationFailed() {
                Toast.makeText(MainActivity.this, "Biometric not recognized. Try again.", Toast.LENGTH_SHORT).show();
            }
        });
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock Global Messenger")
                .setSubtitle("Authenticate to access your messages")
                .setNegativeButtonText("Cancel")
                .build();
        prompt.authenticate(info);
    }

    private class SecurityBridge {
        @JavascriptInterface public boolean isBiometricAvailable() { return biometricAvailable(); }
        @JavascriptInterface public boolean isBiometricLockEnabled() { return securityPrefs.getBoolean(BIOMETRIC_LOCK, false); }
        @JavascriptInterface public void setBiometricLock(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled && !biometricAvailable()) {
                    Toast.makeText(MainActivity.this, "No supported biometric credential is available on this device.", Toast.LENGTH_LONG).show();
                    return;
                }
                securityPrefs.edit().putBoolean(BIOMETRIC_LOCK, enabled).apply();
                if (enabled) authenticateForApp();
            });
        }
        @JavascriptInterface public void lockNow() {
            runOnUiThread(() -> { if (securityPrefs.getBoolean(BIOMETRIC_LOCK, false)) { webView.setVisibility(View.INVISIBLE); authenticateForApp(); } });
        }
    }

    private void requestRuntimePermissions() {
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 1001);
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null && securityPrefs != null && securityPrefs.getBoolean(BIOMETRIC_LOCK, false) && authenticatedThisLaunch) {
            authenticatedThisLaunch = false;
            webView.setVisibility(View.INVISIBLE);
            webView.postDelayed(this::authenticateForApp, 150);
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
