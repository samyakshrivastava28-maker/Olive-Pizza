import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set UNUserNotificationCenter delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Register Interactive Notification Categories for iOS
        registerNotificationCategories()
        
        // Register for Remote Notifications
        UIApplication.shared.registerForRemoteNotifications()
        
        return true
    }

    // MARK: - Notification Categories Setup
    private func registerNotificationCategories() {
        // 1. Order Action Category (Restaurant KDS / Kitchen Staff)
        let acceptOrderAction = UNNotificationAction(
            identifier: "ACCEPT",
            title: "✅ Accept Order",
            options: [.foreground, .authenticationRequired]
        )
        let rejectOrderAction = UNNotificationAction(
            identifier: "REJECT",
            title: "❌ Reject",
            options: [.destructive, .authenticationRequired]
        )
        let orderActionCategory = UNNotificationCategory(
            identifier: "ORDER_ACTION_CATEGORY",
            actions: [acceptOrderAction, rejectOrderAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // 2. Delivery Assignment Category (Delivery Partners)
        let acceptDeliveryAction = UNNotificationAction(
            identifier: "ACCEPT",
            title: "🚴 Accept Delivery",
            options: [.foreground, .authenticationRequired]
        )
        let declineDeliveryAction = UNNotificationAction(
            identifier: "DECLINE",
            title: "❌ Decline",
            options: [.destructive, .authenticationRequired]
        )
        let deliveryCategory = UNNotificationCategory(
            identifier: "DELIVERY_ASSIGNMENT_CATEGORY",
            actions: [acceptDeliveryAction, declineDeliveryAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // 3. Customer Order Status Category
        let trackOrderAction = UNNotificationAction(
            identifier: "TRACK_ORDER",
            title: "📍 Track Order",
            options: [.foreground]
        )
        let orderStatusCategory = UNNotificationCategory(
            identifier: "ORDER_STATUS_CATEGORY",
            actions: [trackOrderAction],
            intentIdentifiers: [],
            options: []
        )

        // 4. Marketing & Promotion Category
        let viewOfferAction = UNNotificationAction(
            identifier: "VIEW_OFFER",
            title: "🎁 View Offer",
            options: [.foreground]
        )
        let promoCategory = UNNotificationCategory(
            identifier: "PROMO_CATEGORY",
            actions: [viewOfferAction],
            intentIdentifiers: [],
            options: []
        )

        // 5. System / Security Alert Category
        let viewAlertAction = UNNotificationAction(
            identifier: "VIEW_ALERT",
            title: "⚠️ View Alert",
            options: [.foreground, .authenticationRequired]
        )
        let securityCategory = UNNotificationCategory(
            identifier: "SECURITY_ALERT_CATEGORY",
            actions: [viewAlertAction],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            orderActionCategory,
            deliveryCategory,
            orderStatusCategory,
            promoCategory,
            securityCategory
        ])
    }

    // MARK: - APNs Device Token Registration
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Present banner, play custom sound, and update badge even when app is in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Forward notification response (action clicked / opened) to Capacitor
        let userInfo = response.notification.request.content.userInfo
        let actionIdentifier = response.actionIdentifier
        
        NotificationCenter.default.post(
            name: Notification.Name("CapacitorNotificationAction"),
            object: [
                "action": actionIdentifier,
                "data": userInfo
            ]
        )
        
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
