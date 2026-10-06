package com.olivepizza.app.plugins;

import android.content.Intent;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.truecaller.android.sdk.ITrueCallback;
import com.truecaller.android.sdk.TrueError;
import com.truecaller.android.sdk.TrueProfile;
import com.truecaller.android.sdk.TruecallerSDK;
import com.truecaller.android.sdk.TruecallerSdkScope;

@CapacitorPlugin(name = "Truecaller")
public class TruecallerPlugin extends Plugin {

    private PluginCall savedCall;

    private final ITrueCallback trueCallback = new ITrueCallback() {
        @Override
        public void onSuccessProfileShared(@NonNull TrueProfile trueProfile) {
            if (savedCall != null) {
                JSObject ret = new JSObject();
                ret.put("successful", true);
                ret.put("firstName", trueProfile.firstName);
                ret.put("lastName", trueProfile.lastName);
                ret.put("phoneNumber", trueProfile.phoneNumber);
                ret.put("gender", trueProfile.gender);
                ret.put("street", trueProfile.street);
                ret.put("city", trueProfile.city);
                ret.put("zipcode", trueProfile.zipcode);
                ret.put("countryCode", trueProfile.countryCode);
                ret.put("email", trueProfile.email);
                ret.put("url", trueProfile.url);
                ret.put("avatarUrl", trueProfile.avatarUrl);
                ret.put("isVerified", trueProfile.isTrueName);
                ret.put("payload", trueProfile.payload);
                ret.put("signature", trueProfile.signature);
                ret.put("signatureAlgorithm", trueProfile.signatureAlgorithm);
                ret.put("requestNonce", trueProfile.requestNonce);
                ret.put("isBusiness", trueProfile.isBusiness);
                savedCall.resolve(ret);
                savedCall = null;
            }
        }

        @Override
        public void onFailureProfileShared(@NonNull TrueError trueError) {
            if (savedCall != null) {
                String errorReason = "ERROR_TYPE_NULL";
                switch (trueError.getErrorType()) {
                    case TrueError.ERROR_TYPE_INTERNAL:
                        errorReason = "ERROR_TYPE_INTERNAL";
                        break;
                    case TrueError.ERROR_TYPE_NETWORK:
                        errorReason = "ERROR_TYPE_NETWORK";
                        break;
                    case TrueError.ERROR_TYPE_USER_DENIED:
                        errorReason = "ERROR_TYPE_USER_DENIED";
                        break;
                    case TrueError.ERROR_PROFILE_NOT_FOUND:
                        errorReason = "ERROR_TYPE_UNAUTHORIZED_PARTNER";
                        break;
                    case TrueError.ERROR_TYPE_UNAUTHORIZED_USER:
                        errorReason = "ERROR_TYPE_UNAUTHORIZED_USER";
                        break;
                    case TrueError.ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY:
                        errorReason = "ERROR_TYPE_TRUECALLER_CLOSED_UNEXPECTEDLY";
                        break;
                    case TrueError.ERROR_TYPE_TRUESDK_TOO_OLD:
                        errorReason = "ERROR_TYPE_TRUESDK_TOO_OLD";
                        break;
                    case TrueError.ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION:
                        errorReason = "ERROR_TYPE_POSSIBLE_REQ_CODE_COLLISION";
                        break;
                    case TrueError.ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH:
                        errorReason = "ERROR_TYPE_RESPONSE_SIGNATURE_MISMATCH";
                        break;
                    case TrueError.ERROR_TYPE_REQUEST_NONCE_MISMATCH:
                        errorReason = "ERROR_TYPE_REQUEST_NONCE_MISMATCH";
                        break;
                    case TrueError.ERROR_TYPE_INVALID_ACCOUNT_STATE:
                        errorReason = "ERROR_TYPE_INVALID_ACCOUNT_STATE";
                        break;
                    case TrueError.ERROR_TYPE_TC_NOT_INSTALLED:
                        errorReason = "ERROR_TYPE_TC_NOT_INSTALLED";
                        break;
                    case TrueError.ERROR_TYPE_ACTIVITY_NOT_FOUND:
                        errorReason = "ERROR_TYPE_ACTIVITY_NOT_FOUND";
                        break;
                }
                savedCall.reject(errorReason, Integer.toString(trueError.getErrorType()));
                savedCall = null;
            }
        }

        @Override
        public void onVerificationRequired(@Nullable TrueError trueError) {
            if (savedCall != null) {
                // If the user does not have the app installed or requires SMS verification
                savedCall.reject("VerificationRequired", "404");
                savedCall = null;
            }
        }
    };

    @Override
    public void load() {
        super.load();
        
        TruecallerSdkScope trueScope = new TruecallerSdkScope.Builder(getContext(), trueCallback)
                .consentMode(TruecallerSdkScope.CONSENT_MODE_BOTTOMSHEET)
                .buttonColor(Color.parseColor("#E76F51"))
                .buttonTextColor(Color.parseColor("#FFFFFF"))
                .loginTextPrefix(TruecallerSdkScope.LOGIN_TEXT_PREFIX_TO_CONTINUE)
                .loginTextSuffix(TruecallerSdkScope.LOGIN_TEXT_SUFFIX_PLEASE_VERIFY_MOBILE_NO)
                .ctaTextPrefix(TruecallerSdkScope.CTA_TEXT_PREFIX_USE)
                .buttonShapeOptions(TruecallerSdkScope.BUTTON_SHAPE_ROUNDED)
                .privacyPolicyUrl("https://olivepizza.app/privacy")
                .termsOfServiceUrl("https://olivepizza.app/terms")
                .footerType(TruecallerSdkScope.FOOTER_TYPE_SKIP)
                .build();
                
        TruecallerSDK.init(trueScope);
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        if (TruecallerSDK.getInstance() != null && TruecallerSDK.getInstance().isUsable()) {
            ret.put("isSupported", true);
        } else {
            ret.put("isSupported", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void verify(PluginCall call) {
        if (TruecallerSDK.getInstance() != null && TruecallerSDK.getInstance().isUsable()) {
            savedCall = call;
            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    TruecallerSDK.getInstance().getUserProfile(getActivity());
                }
            });
        } else {
            call.reject("Truecaller is not supported or not installed.");
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (TruecallerSDK.getInstance() != null) {
            TruecallerSDK.getInstance().onActivityResultObtained(getActivity(), requestCode, resultCode, data);
        }
    }
}
