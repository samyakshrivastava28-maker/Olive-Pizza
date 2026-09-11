//
//  OrderTrackingAttributes.swift
//  Olive Pizza
//
//  Shared ActivityAttributes for Live Activities & Dynamic Island.
//

import Foundation
import ActivityKit

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
