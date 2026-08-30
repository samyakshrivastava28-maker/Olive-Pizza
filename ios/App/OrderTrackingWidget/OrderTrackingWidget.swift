//
//  OrderTrackingWidget.swift
//  Olive Pizza iOS Live Activities & Dynamic Island Widget
//
//  Provides real-time Lock Screen & Dynamic Island active order status tracking
//  powered by Apple ActivityKit & APNs updates via Firebase Cloud Messaging.
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes & Content State
public struct OrderTrackingAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var orderNumber: String
        public var status: String        // "pending", "accepted", "preparing", "ready", "partner_assigned", "out_for_delivery", "delivered", "cancelled"
        public var step: Int             // 1 to 7
        public var itemsSummary: String  // e.g. "2× Farmhouse Large + Extra Cheese"
        public var totalAmount: Double   // e.g. 858.0
        public var etaMinutes: Int       // e.g. 25
        public var riderName: String     // e.g. "Rahul S."
        public var riderPhone: String    // e.g. "••••••••21"
        public var restaurantName: String// e.g. "Olive Pizza — Rajnandgaon HQ"
        public var updatedAt: String     // ISO timestamp

        public init(
            orderNumber: String,
            status: String,
            step: Int,
            itemsSummary: String,
            totalAmount: Double,
            etaMinutes: Int = 25,
            riderName: String = "",
            riderPhone: String = "",
            restaurantName: String = "Olive Pizza",
            updatedAt: String = ""
        ) {
            self.orderNumber = orderNumber
            self.status = status
            self.step = step
            self.itemsSummary = itemsSummary
            self.totalAmount = totalAmount
            self.etaMinutes = etaMinutes
            self.riderName = riderName
            self.riderPhone = riderPhone
            self.restaurantName = restaurantName
            self.updatedAt = updatedAt
        }
    }

    public var orderId: String

    public init(orderId: String) {
        self.orderId = orderId
    }
}

// MARK: - Status Helpers
extension OrderTrackingAttributes.ContentState {
    var statusTitle: String {
        switch status {
        case "pending": return "Order Placed"
        case "accepted": return "Order Confirmed"
        case "preparing": return "Baking in Oven"
        case "ready": return "Packed & Ready"
        case "partner_assigned": return "Rider Assigned"
        case "out_for_delivery": return "Out for Delivery"
        case "delivered": return "Delivered 🎉"
        case "cancelled": return "Order Cancelled"
        default: return "Processing"
        }
    }

    var statusIcon: String {
        switch status {
        case "pending": return "clock.fill"
        case "accepted": return "checkmark.seal.fill"
        case "preparing": return "flame.fill"
        case "ready": return "bag.fill"
        case "partner_assigned": return "person.badge.shield.checkmark.fill"
        case "out_for_delivery": return "bicycle"
        case "delivered": return "checkmark.circle.fill"
        case "cancelled": return "xmark.circle.fill"
        default: return "bag.fill"
        }
    }

    var primaryColor: Color {
        switch status {
        case "delivered": return Color.green
        case "cancelled": return Color.red
        case "out_for_delivery": return Color.orange
        default: return Color(red: 0.13, green: 0.77, blue: 0.36) // Olive Brand Green
        }
    }
}

// MARK: - Widget Definition
@main
struct OrderTrackingWidgetBundle: WidgetBundle {
    var body: some Widget {
        OrderTrackingWidget()
    }
}

struct OrderTrackingWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrderTrackingAttributes.self) { context in
            // MARK: - Lock Screen / StandBy Banner View
            LockScreenOrderView(state: context.state)
                .activityBackgroundTint(Color(red: 0.05, green: 0.08, blue: 0.12))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            // MARK: - Dynamic Island View
            DynamicIsland {
                // Expanded Leading
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: context.state.statusIcon)
                            .foregroundColor(context.state.primaryColor)
                        Text("#\(context.state.orderNumber)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                // Expanded Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        if context.state.status == "delivered" {
                            Text("DONE")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.green)
                        } else if context.state.etaMinutes > 0 {
                            Text("\(context.state.etaMinutes) min")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.orange)
                        }
                        Text("₹\(Int(context.state.totalAmount))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.gray)
                    }
                }
                // Expanded Center / Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.state.statusTitle)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(context.state.primaryColor)

                        Text(context.state.itemsSummary)
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.8))
                            .lineLimit(1)

                        // 7-step mini progress bar
                        HStack(spacing: 4) {
                            ForEach(1...7, id: \.self) { stepIdx in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(stepIdx <= context.state.step ? context.state.primaryColor : Color.white.opacity(0.2))
                                    .frame(height: 4)
                            }
                        }
                    }
                    .padding(.top, 4)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Image(systemName: context.state.statusIcon)
                        .foregroundColor(context.state.primaryColor)
                        .font(.system(size: 12))
                    Text("#\(context.state.orderNumber)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
            } compactTrailing: {
                if context.state.status == "delivered" {
                    Image(systemName: "checkmark")
                        .foregroundColor(.green)
                        .font(.system(size: 12, weight: .bold))
                } else if context.state.etaMinutes > 0 {
                    Text("\(context.state.etaMinutes)m")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.orange)
                } else {
                    Text("₹\(Int(context.state.totalAmount))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.gray)
                }
            } minimal: {
                Image(systemName: context.state.statusIcon)
                    .foregroundColor(context.state.primaryColor)
                    .font(.system(size: 12))
            }
        }
    }
}

// MARK: - Lock Screen View
struct LockScreenOrderView: View {
    let state: OrderTrackingAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: state.statusIcon)
                        .foregroundColor(state.primaryColor)
                        .font(.system(size: 16, weight: .bold))
                    Text("Olive Pizza • #\(state.orderNumber)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                }
                Spacer()
                if state.status == "delivered" {
                    Text("DELIVERED")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.green.opacity(0.2))
                        .cornerRadius(6)
                } else if state.etaMinutes > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                        Text("\(state.etaMinutes) mins")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundColor(.orange)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(6)
                }
            }

            Text(state.statusTitle)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(state.primaryColor)

            Text(state.itemsSummary)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.85))
                .lineLimit(1)

            // Step Progress Bar
            HStack(spacing: 5) {
                ForEach(1...7, id: \.self) { idx in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(idx <= state.step ? state.primaryColor : Color.white.opacity(0.2))
                        .frame(height: 5)
                }
            }

            if !state.riderName.isEmpty && state.status == "out_for_delivery" {
                HStack {
                    Image(systemName: "bicycle")
                        .foregroundColor(.orange)
                    Text("Rider: \(state.riderName)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                    Text("₹\(Int(state.totalAmount))")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.top, 2)
            }
        }
        .padding(14)
    }
}
