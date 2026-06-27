const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Config
const API_URL = process.env.MAYTAPI_PRODUCT_ID && process.env.MAYTAPI_TOKEN ? 
  `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}/${process.env.MAYTAPI_PHONE_ID}/sendMessage?token=${process.env.MAYTAPI_TOKEN}` : '';

// Products Data (Hardcoded for now)
const products = [
  {
    name: 'Premium Sofa',
    price: '25000',
    category: 'Furniture',
    colors: 'Red, Blue, Beige',
    material: 'Fabric',
    dimensions: '2.5 x 1.5m',
    description: 'Premium 3-seater sofa with luxury fabric'
  }
];

// Showroom Info
const showroom = {
  name: 'Astoria Home',
  address: '145, M.G. Road, Sultanpur, New Delhi – 110030',
  phone: '9560511085',
  timing: '10 AM to 8 PM',
  website: 'www.astoriahome.com'
};

// Send Message Function
async function sendMessage(phoneNumber, text) {
  try {
    let phone = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (!phone.startsWith('91')) {
      phone = '91' + phone.slice(-10);
    }

    const payload = {
      to_number: phone,
      type: 'text',
      message: text
    };

    await axios.post(API_URL, payload);
    console.log(`✅ Message sent to ${phone}`);
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Generate Reply
function generateReply(userMessage) {
  const msg = userMessage.toLowerCase();

  // Showroom inquiry
  if (msg.includes('address') || msg.includes('location') || 
      msg.includes('showroom') || msg.includes('visit') ||
      msg.includes('timing') || msg.includes('hours')) {
    return `🏠 *${showroom.name}*

📍 Address: ${showroom.address}
⏰ Timing: ${showroom.timing}
📞 Phone: ${showroom.phone}
🌐 Website: ${showroom.website}

Visit us to see our complete collection! ✨`;
  }

  // Product search
  if (msg.includes('sofa') || msg.includes('furniture') || msg.includes('product')) {
    let reply = '📦 *Available Products:*\n\n';
    products.forEach((p, i) => {
      reply += `${i+1}. *${p.name}*\n`;
      reply += `   💰 ₹${p.price}\n`;
      reply += `   🎨 Colors: ${p.colors}\n`;
      reply += `   📐 ${p.dimensions}\n\n`;
    });
    reply += 'Reply with product name for more details!';
    return reply;
  }

  // Color inquiry
  if (msg.includes('color') || msg.includes('red') || msg.includes('blue') || 
      msg.includes('beige') || msg.includes('black') || msg.includes('white')) {
    return `🎨 We have multiple color options!

Available colors: Red, Blue, Beige, Black, White

Reply with specific product name to see colors!
Example: "Sofa colors"`;
  }

  // Price inquiry
  if (msg.includes('price') || msg.includes('cost') || msg.includes('rupees')) {
    let reply = '💰 *Price List:*\n\n';
    products.forEach(p => {
      reply += `*${p.name}:* ₹${p.price}\n`;
    });
    reply += '\nReply with product name for full details!';
    return reply;
  }

  // Default
  return `👋 Welcome to *Astoria Home*!

I can help you with:
🛋️ Products & Prices
🎨 Colors & Variants
📍 Showroom Location
⏰ Opening Hours
📞 Contact Info

What would you like to know?`;
}

// Webhook
app.post('/webhook', async (req, res) => {
  try {

    console.log("========== WEBHOOK ==========");
    console.log(JSON.stringify(req.body, null, 2));

    const data = req.body;

    if (!data.messages || data.messages.length === 0) {
      return res.json({ success: true });
    }

    const message = data.messages[0];

    const message = data.messages[0];
    const fromNumber = message.from_number;
    const userText = message.text.body || 'Hi';

    console.log(`📨 From ${fromNumber}: ${userText}`);

    // Generate reply
    const reply = generateReply(userText);

    // Send reply
    await sendMessage(fromNumber, reply);

    res.json({ success: true, message: 'Reply sent' });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Bot running ✅' });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 Astoria Home Bot running on port ${PORT}`);
  console.log(`📍 ${showroom.address}`);
  console.log(`✅ Ready!\n`);
});

module.exports = app;
