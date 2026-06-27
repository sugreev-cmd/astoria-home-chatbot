// ============================================
// 🤖 ASTORIA HOME WHATSAPP CHATBOT
// AI-Powered Smart Chatbot
// ============================================

const express = require('express');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

const app = express();
app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================
const MAYTAPI_PRODUCT_ID = process.env.MAYTAPI_PRODUCT_ID;
const MAYTAPI_TOKEN = process.env.MAYTAPI_TOKEN;
const MAYTAPI_PHONE_ID = process.env.MAYTAPI_PHONE_ID;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const SHOWROOM_INFO = {
  name: "Astoria Home",
  address: "145, M.G. Road, Sultanpur, New Delhi – 110030",
  phone: "9560511085",
  timing: "10 AM to 8 PM",
  website: "www.astoriahome.com"
};

const MAYTAPI_URL = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage?token=${MAYTAPI_TOKEN}`;

// ============================================
// PRODUCTS CACHE
// ============================================
let productsCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================
// FETCH PRODUCTS FROM GOOGLE SHEETS
// ============================================
async function fetchProducts() {
  try {
    const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);
    doc.useApiKey(GOOGLE_API_KEY);
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    const products = rows.map(row => ({
      name: row.get('Product Name') || '',
      category: row.get('Category') || '',
      price: row.get('Price') || '',
      colors: {
        color1: row.get('Color1') || '',
        color1Image: row.get('Color1 Image') || '',
        color2: row.get('Color2') || '',
        color2Image: row.get('Color2 Image') || '',
        color3: row.get('Color3') || '',
        color3Image: row.get('Color3 Image') || ''
      },
      description: row.get('Description') || '',
      material: row.get('Material') || '',
      dimensions: row.get('Dimensions') || '',
      stock: row.get('Stock') || 'Available'
    })).filter(p => p.name);
    
    productsCache = products;
    lastCacheUpdate = Date.now();
    
    console.log(`✅ Fetched ${products.length} products`);
    return products;
    
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    return productsCache;
  }
}

// ============================================
// GET PRODUCTS (WITH CACHING)
// ============================================
async function getProducts() {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION || productsCache.length === 0) {
    await fetchProducts();
  }
  return productsCache;
}

// ============================================
// SEARCH PRODUCTS
// ============================================
function searchProducts(query, products) {
  const lowerQuery = query.toLowerCase();
  
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery)
  );
}

// ============================================
// FIND COLOR VARIANTS
// ============================================
function findColorVariant(productName, colorQuery, products) {
  const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
  
  if (!product) return null;
  
  const lowerColorQuery = colorQuery.toLowerCase();
  const colors = [
    { name: product.colors.color1, image: product.colors.color1Image },
    { name: product.colors.color2, image: product.colors.color2Image },
    { name: product.colors.color3, image: product.colors.color3Image }
  ].filter(c => c.name);
  
  return colors.find(c => c.name.toLowerCase().includes(lowerColorQuery)) || colors[0];
}

// ============================================
// FORMAT PRODUCT MESSAGE
// ============================================
function formatProductMessage(product) {
  let msg = `🛋️ *${product.name}*\n\n`;
  msg += `💰 Price: ₹${product.price}\n`;
  msg += `📦 Status: ${product.stock}\n\n`;
  
  if (product.material) msg += `🧵 Material: ${product.material}\n`;
  if (product.dimensions) msg += `📐 Dimensions: ${product.dimensions}\n`;
  
  msg += `\n${product.description}\n\n`;
  
  const colors = [];
  if (product.colors.color1) colors.push(product.colors.color1);
  if (product.colors.color2) colors.push(product.colors.color2);
  if (product.colors.color3) colors.push(product.colors.color3);
  
  if (colors.length > 0) {
    msg += `🎨 Available Colors: ${colors.join(', ')}\n\n`;
    msg += `Reply with color name (e.g., "Blue") to see that variant!`;
  }
  
  return msg;
}

// ============================================
// FORMAT SHOWROOM MESSAGE
// ============================================
function formatShowroomMessage() {
  return `
🏠 *${SHOWROOM_INFO.name}*

📍 *Address:*
${SHOWROOM_INFO.address}

⏰ *Timing:*
${SHOWROOM_INFO.timing}

📞 *Phone:*
${SHOWROOM_INFO.phone}

🌐 *Website:*
${SHOWROOM_INFO.website}

Visit us to see our complete collection in person! ✨
  `.trim();
}

// ============================================
// AI RESPONSE GENERATOR
// ============================================
async function generateSmartReply(userMessage, products) {
  const lowerMsg = userMessage.toLowerCase();
  
  // Check for showroom inquiry
  if (lowerMsg.includes('address') || lowerMsg.includes('location') || 
      lowerMsg.includes('showroom') || lowerMsg.includes('visit')) {
    return { type: 'showroom', message: formatShowroomMessage() };
  }
  
  // Check for product search
  const searchResults = searchProducts(userMessage, products);
  
  if (searchResults.length > 0) {
    if (searchResults.length === 1) {
      return { 
        type: 'product', 
        product: searchResults[0],
        message: formatProductMessage(searchResults[0])
      };
    } else {
      let msg = `📦 Found ${searchResults.length} products:\n\n`;
      searchResults.forEach((p, i) => {
        msg += `${i+1}. *${p.name}* - ₹${p.price}\n`;
      });
      msg += `\nWhich one would you like to know more about?`;
      return { type: 'list', message: msg };
    }
  }
  
  // Check for color inquiry
  if (lowerMsg.includes('color') || lowerMsg.includes('blue') || 
      lowerMsg.includes('red') || lowerMsg.includes('black') ||
      lowerMsg.includes('white') || lowerMsg.includes('brown') ||
      lowerMsg.includes('beige') || lowerMsg.includes('grey')) {
    
    return { 
      type: 'color',
      message: `🎨 Please tell me which product's color you'd like to see.\n\nExample: "Blue sofa" or "Red cushion"`
    };
  }
  
  // Default helpful response
  const defaultMsg = `👋 Welcome to *Astoria Home*!\n\n
I can help you with:
🛋️ Product information
🎨 Color variants
💰 Pricing details
📍 Showroom location
⏰ Opening hours

What would you like to know? Just describe the product you're interested in!`;
  
  return { type: 'default', message: defaultMsg };
}

// ============================================
// SEND MESSAGE VIA WHATSAPP
// ============================================
async function sendWhatsAppMessage(phoneNumber, message, imageUrl = null) {
  try {
    // Format phone number
    let phone = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (!phone.startsWith('91')) {
      phone = '91' + phone.slice(-10);
    }
    
    // Send image if provided
    if (imageUrl) {
      try {
        const imagePayload = {
          to_number: phone,
          type: 'link',
          message: imageUrl,
          text: message
        };
        
        await axios.post(MAYTAPI_URL, imagePayload);
        console.log(`✅ Image sent to ${phone}`);
      } catch (imgError) {
        console.log(`⚠️ Image send failed, sending text only`);
      }
    }
    
    // Send text message
    const payload = {
      to_number: phone,
      type: 'text',
      message: message
    };
    
    const response = await axios.post(MAYTAPI_URL, payload);
    console.log(`✅ Message sent to ${phone}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    return false;
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================
app.post('/webhook', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data.messages || data.messages.length === 0) {
      return res.json({ success: true });
    }
    
    const message = data.messages[0];
    const fromNumber = message.from_number;
    const userText = message.text.body || '';
    
    console.log(`📨 Message from ${fromNumber}: ${userText}`);
    
    // Get products
    const products = await getProducts();
    
    // Generate smart reply
    const reply = await generateSmartReply(userText, products);
    
    // Send reply
    let imageUrl = null;
    if (reply.type === 'product' && reply.product.colors.color1Image) {
      imageUrl = reply.product.colors.color1Image;
    }
    
    await sendWhatsAppMessage(fromNumber, reply.message, imageUrl);
    
    res.json({ success: true, reply: reply.message });
    
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'Bot is running! ✅' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`\n🤖 Astoria Home Chatbot running on port ${PORT}`);
  console.log(`📱 WhatsApp Bot Active`);
  
  // Initial product fetch
  await fetchProducts();
  
  console.log(`\n✅ Bot Ready!`);
  console.log(`🏠 Showroom: ${SHOWROOM_INFO.name}`);
  console.log(`📍 Location: ${SHOWROOM_INFO.address}`);
  console.log(`📞 Phone: ${SHOWROOM_INFO.phone}\n`);
});

module.exports = app;
