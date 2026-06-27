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
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
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
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
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
    image: 'https://images.unsplash.com/photo-1472707169080-9049773400b5',
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
  website: 'www.astoriahome.com',
  email: 'info@astoriahome.com'
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

    const response = await axios.post(API_URL, payload);
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
  return `
🏠 *${SHOWROOM.name}*

📍 *Address:*
${SHOWROOM.address}

⏰ *Timing:*
${SHOWROOM.timing}

📞 *Phone:*
${SHOWROOM.phone}

✉️ *Email:*
${SHOWROOM.email}

🌐 *Website:*
${SHOWROOM.website}

Visit us to see our complete collection in person! ✨
  `.trim();
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
      let msg = `📦 *Found ${searchResults.length} Products:*\n\n`;
      searchResults.forEach((p, i) => {
        msg += `${i + 1}. *${p.name}* - ₹${p.price}\n`;
      });
      msg += `\nReply with product name for details!`;
      return msg;
    }
  }

  // Price Inquiry
  if (msg.includes('price') || msg.includes('cost') || 
      msg.includes('rupees') || msg.includes('₹')) {
    let reply = `💰 *Price List:*\n\n`;
    PRODUCTS.forEach(p => {
      reply += `*${p.name}:* ₹${p.price}\n`;
    });
    reply += `\nReply with product name for full details!`;
    return reply;
  }

  // Color Inquiry
  if (msg.includes('color') || msg.includes('red') || 
      msg.includes('blue') || msg.includes('beige') ||
      msg.includes('black') || msg.includes('white') ||
      msg.includes('brown')) {
    return `🎨 We have multiple color options!\n\nReply with product name to see available colors!\nExample: "Sofa" or "Bed"`;
  }

  // Material/Dimension Inquiry
  if (msg.includes('material') || msg.includes('size') || 
      msg.includes('dimension') || msg.includes('specification')) {
    return `📐 Tell me which product you're interested in!\n\nWe have:\n• Premium Sofa\n• Bed Set\n• Dining Table\n\nReply with product name!`;
  }

  // Default Welcome Message
  return `
👋 Welcome to *Astoria Home*!

I'm here to help you with:
🛋️ Product Information
💰 Pricing Details
🎨 Color Variants
📐 Dimensions & Materials
📍 Showroom Location
⏰ Opening Hours
📞 Contact Information

What would you like to know?
  `.trim();
}

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Bot is running ✅',
    timestamp: new Date().toISOString(),
    products: PRODUCTS.length
  });
});

// Webhook Handler
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n📨 Webhook received');
    
    const data = req.body;

    // Validate request
    if (!data.messages || data.messages.length === 0) {
      console.log('⚠️ No messages in request');
      return res.json({ success: true, message: 'No messages' });
    }

    const message = data.messages[0];
    const fromNumber = message.from_number;
    const userText = message.text?.body || 'Hi';

    console.log(`👤 From: ${fromNumber}`);
    console.log(`💬 Message: ${userText}`);

    // Generate Reply
    const reply = generateSmartReply(userText);
    console.log(`📤 Reply: ${reply.substring(0, 50)}...`);

    // Send Reply
    const sent = await sendWhatsAppMessage(fromNumber, reply);

    res.json({ 
      success: sent,
      message: 'Reply sent',
      userMessage: userText
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

// Test Route
app.post('/test', (req, res) => {
  const testMessage = generateSmartReply('Hello');
  res.json({ 
    success: true,
    message: testMessage,
    products: PRODUCTS.length
  });
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
║   ✅ Bot is running on port ${PORT}         ║
║   ✅ Webhook: /webhook                ║
║   ✅ Health: /health                  ║
║   ✅ Products: ${PRODUCTS.length}                   ║
║                                        ║
║   📍 ${SHOWROOM.name}                ║
║   📞 ${SHOWROOM.phone}                    ║
║                                        ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
