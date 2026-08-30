//
//  NotificationService.swift
//  Olive Pizza iOS Notification Service Extension
//
//  Downloads and attaches rich images (pizza thumbnails, promo banners) to iOS push notifications.
//

import UserNotifications

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
        
        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        // Extract image URL from userInfo (FCM fcm_options.image or data.image)
        var imageUrlString: String? = nil
        if let fcmOptions = bestAttemptContent.userInfo["fcm_options"] as? [String: Any],
           let image = fcmOptions["image"] as? String {
            imageUrlString = image
        } else if let image = bestAttemptContent.userInfo["image"] as? String {
            imageUrlString = image
        }

        guard let urlString = imageUrlString, let url = URL(string: urlString) else {
            contentHandler(bestAttemptContent)
            return
        }

        // Download image and attach
        downloadImage(from: url) { attachment in
            if let attachment = attachment {
                bestAttemptContent.attachments = [attachment]
            }
            contentHandler(bestAttemptContent)
        }
    }
    
    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }

            let fileExtension = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
            let fileURL = tempDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension(fileExtension)

            do {
                try data.write(to: fileURL)
                let attachment = try UNNotificationAttachment(identifier: "media_attachment", url: fileURL, options: nil)
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
