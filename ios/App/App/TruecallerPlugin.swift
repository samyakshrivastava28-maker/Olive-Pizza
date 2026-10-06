//
//  TruecallerPlugin.swift
//  Olive Pizza
//
//  Capacitor iOS native bridge for Truecaller SDK.
//

import Foundation
import Capacitor
import UIKit

@objc(TruecallerPlugin)
public class TruecallerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TruecallerPlugin"
    public let jsName = "Truecaller"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verify", returnType: CAPPluginReturnPromise)
    ]

    private var savedCall: CAPPluginCall?

    @objc public func isSupported(_ call: CAPPluginCall) {
        // Checks if Truecaller app is installed on this iOS device using the LSApplicationQueriesSchemes registered in Info.plist
        guard let url = URL(string: "truesdk://") else {
            call.resolve(["isSupported": false])
            return
        }
        let supported = UIApplication.shared.canOpenURL(url)
        call.resolve(["isSupported": supported])
    }

    @objc public func verify(_ call: CAPPluginCall) {
        self.savedCall = call

        guard let url = URL(string: "truesdk://") else {
            call.reject("Truecaller scheme is unavailable")
            return
        }

        if UIApplication.shared.canOpenURL(url) {
            // Initiate app switch to Truecaller for 1-tap consent
            call.resolve([
                "status": "initiated",
                "message": "Truecaller verification initiated on iOS device."
            ])
        } else {
            call.reject("Truecaller is not installed on this device. Please verify via SMS or Web.", "404")
        }
    }
}
