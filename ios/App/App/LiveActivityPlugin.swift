//
//  LiveActivityPlugin.swift
//  Olive Pizza
//
//  Capacitor bridge for Apple ActivityKit Live Activities and Dynamic Island.
//

import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "areActivitiesEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endActivity", returnType: CAPPluginReturnPromise)
    ]

    @objc public func areActivitiesEnabled(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            let enabled = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve(["enabled": enabled])
        } else {
            call.resolve(["enabled": false])
        }
    }

    @objc public func startActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1 or later")
            return
        }

        guard let orderId = call.getString("orderId"), !orderId.isEmpty else {
            call.reject("orderId is required")
            return
        }

        let orderNumber = call.getString("orderNumber") ?? orderId
        let status = call.getString("status") ?? "pending"
        let step = call.getInt("step") ?? 1
        let itemsSummary = call.getString("itemsSummary") ?? "Olive Pizza Order"
        let totalAmount = call.getDouble("totalAmount") ?? 0.0
        let etaMinutes = call.getInt("etaMinutes") ?? 25
        let riderName = call.getString("riderName") ?? ""
        let riderPhone = call.getString("riderPhone") ?? ""
        let restaurantName = call.getString("restaurantName") ?? "Olive Pizza"

        // Check if an activity for this orderId already exists
        if let existing = Activity<OrderTrackingAttributes>.activities.first(where: { .attributes.orderId == orderId }) {
            let contentState = OrderTrackingAttributes.ContentState(
                orderNumber: orderNumber,
                status: status,
                step: step,
                itemsSummary: itemsSummary,
                totalAmount: totalAmount,
                etaMinutes: etaMinutes,
                riderName: riderName,
                riderPhone: riderPhone,
                restaurantName: restaurantName,
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            Task {
                await existing.update(using: contentState)
            }
            call.resolve(["activityId": existing.id, "alreadyActive": true])
            return
        }

        let attributes = OrderTrackingAttributes(orderId: orderId)
        let initialContentState = OrderTrackingAttributes.ContentState(
            orderNumber: orderNumber,
            status: status,
            step: step,
            itemsSummary: itemsSummary,
            totalAmount: totalAmount,
            etaMinutes: etaMinutes,
            riderName: riderName,
            riderPhone: riderPhone,
            restaurantName: restaurantName,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        do {
            let activity = try Activity<OrderTrackingAttributes>.request(
                attributes: attributes,
                contentState: initialContentState,
                pushType: .token
            )

            // Listen for push token updates from ActivityKit
            Task {
                for await pushTokenData in activity.pushTokenUpdates {
                    let tokenString = pushTokenData.map { String(format: "%02x", ) }.joined()
                    self.notifyListeners("pushTokenReceived", data: [
                        "orderId": orderId,
                        "activityId": activity.id,
                        "pushToken": tokenString
                    ])
                }
            }

            call.resolve([
                "activityId": activity.id,
                "success": true
            ])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    @objc public func updateActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1 or later")
            return
        }

        guard let orderId = call.getString("orderId") else {
            call.reject("orderId is required")
            return
        }

        guard let activity = Activity<OrderTrackingAttributes>.activities.first(where: { .attributes.orderId == orderId }) else {
            call.reject("No active Live Activity found for order \(orderId)")
            return
        }

        let orderNumber = call.getString("orderNumber") ?? orderId
        let status = call.getString("status") ?? "pending"
        let step = call.getInt("step") ?? 1
        let itemsSummary = call.getString("itemsSummary") ?? "Olive Pizza Order"
        let totalAmount = call.getDouble("totalAmount") ?? 0.0
        let etaMinutes = call.getInt("etaMinutes") ?? 25
        let riderName = call.getString("riderName") ?? ""
        let riderPhone = call.getString("riderPhone") ?? ""
        let restaurantName = call.getString("restaurantName") ?? "Olive Pizza"

        let updatedContentState = OrderTrackingAttributes.ContentState(
            orderNumber: orderNumber,
            status: status,
            step: step,
            itemsSummary: itemsSummary,
            totalAmount: totalAmount,
            etaMinutes: etaMinutes,
            riderName: riderName,
            riderPhone: riderPhone,
            restaurantName: restaurantName,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        Task {
            await activity.update(using: updatedContentState)
            call.resolve(["success": true, "activityId": activity.id])
        }
    }

    @objc public func endActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["success": true])
            return
        }

        guard let orderId = call.getString("orderId") else {
            call.reject("orderId is required")
            return
        }

        let activitiesToEnd = Activity<OrderTrackingAttributes>.activities.filter { .attributes.orderId == orderId }
        guard !activitiesToEnd.isEmpty else {
            call.resolve(["success": true, "endedCount": 0])
            return
        }

        let status = call.getString("status") ?? "delivered"
        let dismissalDelay = call.getInt("dismissalSeconds") ?? 300

        Task {
            for activity in activitiesToEnd {
                var finalState = activity.contentState
                finalState.status = status
                finalState.updatedAt = ISO8601DateFormatter().string(from: Date())

                await activity.end(
                    using: finalState,
                    dismissalPolicy: dismissalDelay > 0 ? .after(Date().addingTimeInterval(TimeInterval(dismissalDelay))) : .immediate
                )
            }
            call.resolve(["success": true, "endedCount": activitiesToEnd.count])
        }
    }
}
