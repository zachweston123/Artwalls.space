/** @deprecated — one-time setup script, already run. Stripe products configured in dashboard. */
throw new Error('Dead script: Stripe products already configured');
let content = '';
try {
  content = fs.readFileSync(varsPath, 'utf8');
} catch (e) {
  console.error('❌ Could not read .dev.vars file. Please make sure it exists in the root directory.');
  process.exit(1);
}

// Extract Secret Key
const match = content.match(/STRIPE_SECRET_KEY=(sk_\w+)/);
if (!match) {
  console.error('❌ STRIPE_SECRET_KEY not found in .dev.vars');
  console.log('Please add it like: STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}
const SECRET_KEY = match[1];

const PRODUCTS = [
  {
    name: 'Starter Plan',
    description: 'Perfect for growing artists. 4 displays, 10 artworks.',
    amount: 900, // $9.00
    interval: 'month'
  },
  {
    name: 'Growth Plan',
    description: 'For active professionals. 10 displays, 30 artworks.',
    amount: 1900, // $19.00
    interval: 'month'
  },
  {
    name: 'Pro Plan',
    description: 'Unlimited access and maximized earnings.',
    amount: 3900, // $39.00
    interval: 'month'
  }
];

function createProduct(product) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      'name': product.name,
      'description': product.description,
      'default_price_data[currency]': 'usd',
      'default_price_data[unit_amount]': product.amount,
      'default_price_data[recurring][interval]': product.interval
    }).toString();

    const req = https.request({
      hostname: 'api.stripe.com',
      path: '/v1/products',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const json = JSON.parse(body);
        if (json.error) {
          reject(new Error(json.error.message));
        } else {
          resolve({
            name: product.name,
            productId: json.id,
            priceId: json.default_price
          });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Connecting to Stripe to create products...\n');
  
  const results = {};
  
  try {
    for (const p of PRODUCTS) {
      process.stdout.write(`Creating ${p.name}... `);
      const result = await createProduct(p);
      console.log('✅');
      // Map names to keys expected in .dev.vars
      if (p.name.includes('Starter')) results.STARTER = result.priceId;
      if (p.name.includes('Growth')) results.GROWTH = result.priceId;
      if (p.name.includes('Pro')) results.PRO = result.priceId;
    }

    console.log('\n✨ Products created successfully!\n');
    console.log('=== COPY THESE VALUES TO YOUR .dev.vars FILE ===');
    console.log(`STRIPE_PRICE_ID_STARTER=${results.STARTER}`);
    console.log(`STRIPE_PRICE_ID_GROWTH=${results.GROWTH}`);
    console.log(`STRIPE_PRICE_ID_PRO=${results.PRO}`);
    console.log('==============================================');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }
}

main();
