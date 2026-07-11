import { buildOrderStatusEmail } from './backend/src/services/emailTemplates.service.js';
import * as fs from 'fs';

const dummyOrderData = {
  order_number: "ORD-999123",
  total_amount: 1250,
  subtotal: 1100,
  tax_amount: 100,
  delivery_fee: 50,
  discount_amount: 0,
  estimated_delivery_time: "35 mins",
  payment_method: "upi",
  delivery_address: {
    fullName: "John Doe",
    addressLine1: "123 Main St",
    city: "Rajnandgaon",
    state: "Chhattisgarh",
    postalCode: "491441",
    phone: "+91 9876543210"
  },
  items: [
    {
      product_name: "Farmhouse Pizza",
      variant_name: "Large - Cheese Burst",
      quantity: 1,
      unit_price: 650,
      image_url: "https://res.cloudinary.com/dxmlvkff1/image/upload/v1/olive-pizza/farmhouse.jpg"
    },
    {
      product_name: "Garlic Breadsticks",
      variant_name: null,
      quantity: 2,
      unit_price: 150,
      image_url: "https://res.cloudinary.com/dxmlvkff1/image/upload/v1/olive-pizza/garlic-bread.jpg"
    }
  ]
};

const html = buildOrderStatusEmail({
  customerName: "John",
  subject: "Your Order is Placed",
  stage: "pending",
  orderId: "test-order-id-123",
  data: {},
  orderData: dummyOrderData
});

fs.writeFileSync('email-verification.html', html);
console.log("Email rendered to email-verification.html");
