const admin = require('firebase-admin');

try {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  console.error("Failed to parse Service Account:", e);
  process.exit(1);
}

const token = "cysllIRtHAV9LfQgeECptZ:APA91bFdsNqKXWx1OcDPiM6SpS5H4xTWm4P2RBQOSTZSmDNnXkPM1paDxQuHIgQyiuUe1Rm33GTlcBLDSVr3iIOK5nDJwsurP8Khv77A3W49l3uYVH1UG58";

const message = {
  tokens: [token],
  notification: { title: "Direct Push", body: "Checking if token is valid" }
};

admin.messaging().sendEachForMulticast(message)
  .then(response => {
    console.log(JSON.stringify(response, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
