// Cloudflare Pages Function: Barcode Lookup API
const KNOWN_CATALOG = {
  '8809581078888': {
    name: 'ថ្នាំក្អកកុមារ Tusin Syrup 95ml (Children’s Cold Remedy)',
    category: 'ឱសថ / សុខភាព',
    badge: 'ឱសថ',
    brand: 'Tusin (GENUONE Sciences Korea)',
    costPrice: 2.50,
    price: 4.00,
    stock: 25,
    minStockAlert: 5,
    description: 'Tusin Syrup 95ml - Children’s Cold Remedy (Rx Prescription Drug). Manufactured by GENUONE Sciences Inc. Sejong-si, Korea. Distributed by K1000 CO., LTD. CAM R3 3303IP-06.',
    image: ''
  },
  '063038602899': {
    name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
    category: 'សម្ភារៈប្រើប្រាស់',
    badge: 'អនាម័យ',
    brand: 'JOLLY',
    costPrice: 0.60,
    price: 1.00,
    stock: 25,
    minStockAlert: 5,
    description: 'JOLLY Cotton Buds 260pcs (Pure Cotton 100%). Imported by S.A.K.A Trading Co.,Ltd, Phnom Penh, Cambodia. Made in P.R.C.',
    image: ''
  },
  '63038602899': {
    name: 'JOLLY Cotton Buds 260pcs (សំឡីត្បារត្រចៀក)',
    category: 'សម្ភារៈប្រើប្រាស់',
    badge: 'អនាម័យ',
    brand: 'JOLLY',
    costPrice: 0.60,
    price: 1.00,
    stock: 25,
    minStockAlert: 5,
    description: 'JOLLY Cotton Buds 260pcs (Pure Cotton 100%). Imported by S.A.K.A Trading Co.,Ltd, Phnom Penh, Cambodia. Made in P.R.C.',
    image: ''
  },
  '8809758325685': {
    name: 'Vaseline Collagen Moisture Lotion 1000ml (ឡេលាបខ្លួន)',
    category: 'គ្រឿងសម្អាង / ថែរក្សាស្បែក',
    badge: 'ឡេលាបខ្លួន',
    brand: 'Vaseline',
    costPrice: 5.00,
    price: 8.50,
    stock: 20,
    minStockAlert: 5,
    description: 'Vaseline Collagen Moisture Lotion 1000ml (바세린 콜라겐 모이스처 로션) - Gentle woody scent. Moisturize dry, rough skin with collagen.',
    image: ''
  },
  '8847100741219': {
    name: 'ភេសជ្ជៈប៉ូវកម្លាំង Khmer Beverages 250ml (Red Can)',
    category: 'ភេសជ្ជៈ & អាហារ',
    badge: 'ភេសជ្ជៈ',
    brand: 'Khmer Beverages',
    costPrice: 0.50,
    price: 0.75,
    stock: 30,
    minStockAlert: 5,
    description: 'ភេសជ្ជៈកំប៉ុងក្រហម Khmer Beverages 250ml. Made in Cambodia.',
    image: ''
  }
};

export async function onRequestGet(context) {
  const barcode = context.params.barcode ? String(context.params.barcode).trim() : '';
  if (!barcode) {
    return new Response(JSON.stringify({ found: false, error: 'Barcode required' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1. Check known local catalog
  if (KNOWN_CATALOG[barcode]) {
    return new Response(JSON.stringify({
      found: true,
      source: 'catalog',
      product: { barcode, ...KNOWN_CATALOG[barcode] }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Query Open Food / Beauty Facts online
  try {
    const urls = [
      `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`,
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 1 && data.product) {
            const p = data.product;
            const pName = p.product_name_kh || p.product_name || p.product_name_en || '';
            if (pName) {
              const brand = p.brands || '';
              return new Response(JSON.stringify({
                found: true,
                source: 'online_db',
                product: {
                  barcode,
                  name: brand ? `${brand} - ${pName}` : pName,
                  category: 'ទំនិញទូទៅ',
                  badge: 'ទំនិញថ្មី',
                  brand,
                  costPrice: 0,
                  price: 0,
                  stock: 10,
                  minStockAlert: 5,
                  image: p.image_url || ''
                }
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
        }
      } catch {}
    }
  } catch {}

  // 3. Fallback: Empty name so user can input the real name
  return new Response(JSON.stringify({
    found: true,
    source: 'ai_suggest',
    product: {
      barcode,
      name: '',
      category: 'ទំនិញទូទៅ',
      badge: 'ទំនិញថ្មី',
      costPrice: 0,
      price: 0,
      stock: 10,
      minStockAlert: 5
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
