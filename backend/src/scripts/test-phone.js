import { parsePhoneNumber } from 'libphonenumber-js';
try {
  const phone = '8305500767';
  const phoneNumber = parsePhoneNumber(phone, 'IN');
  if (!phoneNumber || !phoneNumber.isValid() || phoneNumber.country !== 'IN') {
    console.log("INVALID");
  } else {
    console.log("VALID", phoneNumber.format('E.164'));
  }
} catch (e) {
  console.log("ERROR", e.message);
}
