const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================
const MAYTAPI_PRODUCT_ID = process.env.MAYTAPI_PRODUCT_ID;
const MAYTAPI_TOKEN = process.env.MAYTAPI_TOKEN;
const MAYTAPI_PHONE_ID = process.env.MAYTAPI_PHONE_ID;

const API_URL = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage?token=${MAYTAPI_TOKEN}`;

// ============================================
// PRODUCTS DATABASE
// ============================================
const PRODUCTS = [
  {
    id: 1,
    name: 'Premium Sofa',
    price: '25000',
    category: 'Furniture',
    description: 'Premium 3-seater sofa with luxury fabric',
    material: 'Polyester Fabric',
    dimensions: '2.5 x 1.5 meters',
    colors: ['Red', 'Blue', 'Beige'],
    stock: 'Available'
  },
  {
    id: 2,
    name: 'Bed Set',
    price: '15000',
    category: 'Furniture',
    description: 'Queen size bed with premium mattress',
    material: 'Wood & Fabric',
    dimensions: '1.6 x 2.0 meters',
    colors: ['Brown', 'White', 'Black'],
    stock: 'Available'
  },
  {
    id: 3,
    name: 'Dining Table',
    price: '12000',
    category: 'Furniture',
    description: 'Wooden dining table for 6 people',
    material: 'Solid Wood',
    dimensions: '1.8 x 0.9 meters',
    colors: ['Oak', 'Walnut'],
    stock: 'Available'
  }
];

// ============================================
// SHOWROOM INFORMATION
// ============================================
const SHOWROOM = {
  name: 'Astoria Home',
  address: '145, M.G. Road, Sultanpur, New Delhi – 110030',
  phone: '9560511085',
  timing: '10 AM to 8 PM',
  website: 'www.astoriahome.com'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Send WhatsApp Message
async function sendWhatsAppMessage(phoneNumber, messageText) {
  try {
    let phone = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (!phone.startsWith('91')) {
      phone = '91' + phone.slice(-10);
    }

    const payload = {
      to_number: phone,
      type: 'text',
      message: messageText
    };

    await axios.post(API_URL, payload);
    console.log(`✅ Message sent to ${phone}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending message: ${error.message}`);
    return false;
  }
}

// Search Products
function searchProducts(query) {
  const lowerQuery = query.toLowerCase();
  return PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery)
  );
}

// Format Product Message
function formatProductMessage(product) {
  let msg = `🛋️ *${product.name}*\n\n`;
  msg += `💰 *Price:* ₹${product.price}\n`;
  msg += `📦 *Status:* ${product.stock}\n`;
  msg += `🧵 *Material:* ${product.material}\n`;
  msg += `📐 *Dimensions:* ${product.dimensions}\n\n`;
  msg += `*Description:*\n${product.description}\n\n`;
  msg += `🎨 *Available Colors:*\n`;
  product.colors.forEach(color => {
    msg += `  • ${color}\n`;
  });
  msg += `\nReply with color name to know more!`;
  return msg;
}

// Format Showroom Message
function formatShowroomMessage() {
  return `🏠 *${SHOWROOM.name}*

📍 *Address:*
${SHOWROOM.address}

⏰ *Timing:*
${SHOWROOM.timing}

📞 *Phone:*
${SHOWROOM.phone}

🌐 *Website:*
${SHOWROOM.website}

Visit us to see our collection! ✨`;
}

// Generate Smart Reply
function generateSmartReply(userMessage) {
  const msg = userMessage.toLowerCase();

  // Showroom Inquiry
  if (msg.includes('address') || msg.includes('location') || 
      msg.includes('showroom') || msg.includes('visit') ||
      msg.includes('timing') || msg.includes('hours') ||
      msg.includes('phone') || msg.includes('contact')) {
    return formatShowroomMessage();
  }

  // Product Search
  const searchResults = searchProducts(userMessage);
  if (searchResults.length > 0) {
    if (searchResults.length === 1) {
      return formatProductMessage(searchResults[0]);
    } else {
      let reply = `📦 *Found ${searchResults.length} Products:*\n\n`;
      searchResults.forEach((p, i) => {
        reply += `${i + 1}. *${p.name}* - ₹${p.price}\n`;
      });
      reply += `\nReply with product name for details!`;
      return reply;
    }
  }

  // Price Inquiry
  if (msg.includes('price') || msg.includes('cost') || msg.includes('rupees') || msg.includes('₹')) {
    let reply = `💰 *Price List:*\n\n`;
    PRODUCTS.forEach(p => {
      reply += `*${p.name}:* ₹${p.price}\n`;
    });
    reply += `\nReply with product name for details!`;
    return reply;
  }

  // Color Inquiry
  if (msg.includes('color') || msg.includes('red') || msg.includes('blue') || 
      msg.includes('beige') || msg.includes('black') || msg.includes('white') || msg.includes('brown')) {
    return `🎨 We have multiple color options!\n\nTell me which product you're interested in:\n• Sofa\n• Bed\n• Table`;
  }

  // Default Welcome
  return `👋 Welcome to *Astoria Home*!

I can help with:
🛋️ Products
💰 Prices
🎨 Colors
📍 Showroom Location
⏰ Hours
📞 Contact

What would you like?`;
}

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'Bot running ✅' });
});

// Main Webhook
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n📨 Webhook received');
    
    const data = req.body;
    
    // Handle MayTapi format
    let phoneNumber, userMessage;
    
    // Format 1: MayTAPI nested message object — { message: { text, from_number, ... }, phone_id, ... }
    if (data.message && typeof data.message === 'object') {
      const msg = data.message;
      userMessage = msg.text?.body || msg.text || 'Hi';

      // 1a. Try explicit sender fields inside the message object
      phoneNumber = msg.from_number || msg.from || msg.sender || msg.author;

      // 1b. Parse from the message ID string, e.g. "false_247390787371183@lid_..."
      //     The digits between the first underscore and the @ are the sender's number.
      //     NOTE: data.phone_id is the BOT's own phone ID, not the sender's — do not use it here.
      if (!phoneNumber && msg.id && typeof msg.id === 'string') {
        const idMatch = msg.id.match(/_(\d{7,15})@/);
        if (idMatch) {
          phoneNumber = idMatch[1];
          console.log(`📞 Extracted phone from message ID: ${phoneNumber}`);
        }
      }

      console.log(`✅ Format 1: MayTAPI nested message object`);
    }
    // Format 2: messages array — { messages: [{ from_number, text, ... }] }
    else if (data.messages && data.messages.length > 0) {
      const msg = data.messages[0];
      phoneNumber = msg.from_number || msg.from || msg.sender;
      userMessage = msg.text?.body || msg.text || 'Hi';
      console.log(`✅ Format 2: Messages array`);
    }
    // Format 3: flat properties — { from_number, text }
    else if (data.from_number && data.text) {
      phoneNumber = data.from_number;
      userMessage = data.text.body || data.text || 'Hi';
      console.log(`✅ Format 3: Direct properties`);
    }
    // No valid message found
    else {
      console.log(`⚠️ No valid message format found`);
      console.log(`📦 Received data:`, JSON.stringify(data).substring(0, 200));
      return res.json({ success: false, message: 'No valid message format' });
    }

    // Guard: skip if we still couldn't resolve a phone number
    if (!phoneNumber) {
      console.log(`⚠️ Could not determine sender phone number`);
      console.log(`📦 Received data:`, JSON.stringify(data).substring(0, 200));
      return res.json({ success: false, message: 'Could not determine sender phone number' });
    }
    
    console.log(`👤 From: ${phoneNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    // Generate Reply
    const reply = generateSmartReply(userMessage);
    console.log(`📤 Sending reply...`);
    
    // Send Reply
    const sent = await sendWhatsAppMessage(phoneNumber, reply);
    
    if (sent) {
      console.log(`✅ Reply sent successfully\n`);
      res.json({ success: true, message: 'Reply sent' });
    } else {
      console.log(`❌ Failed to send reply\n`);
      res.json({ success: false, message: 'Failed to send' });
    }
    
  } catch (error) {
    console.error(`❌ Webhook Error: ${error.message}\n`);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// TEMP ROUTE TO SET WEBHOOK
// ============================================

app.get("/set-webhook", async (req, res) => {
  try {
    const axios = require("axios");

    const response = await axios.post(
      `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}/${process.env.MAYTAPI_PHONE_ID}/config`,
      {
        webhook: "https://astoria-home-chatbot-production.up.railway.app/webhook"
      },
      {
        headers: {
          "x-maytapi-key": process.env.MAYTAPI_TOKEN
        }
      }
    );

    res.json(response.data);

  } catch (e) {
    res.status(500).json({
      status: e.response?.status,
      data: e.response?.data,
      error: e.message
    });
  }
});


// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🤖 ASTORIA HOME WHATSAPP CHATBOT    ║
║                                        ║
║   ✅ Bot is READY on port ${PORT}         ║
║   ✅ Webhook: /webhook                ║
║   ✅ Health: /health                  ║
║                                        ║
║   📍 ${SHOWROOM.name}                ║
║   📞 ${SHOWROOM.phone}                    ║
║                                        ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
