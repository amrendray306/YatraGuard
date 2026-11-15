import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📍 Seeding City-Wise Local Prices & Real-Time Incident Alerts...');

  const cities = await prisma.city.findMany();
  const cityMap = new Map<string, string>();
  cities.forEach((c) => cityMap.set(c.name.toLowerCase(), c.id));

  const getCityId = (name: string) => cityMap.get(name.toLowerCase()) || cities[0]?.id || '1';

  // 1. Seed Real-Time Incidents / Scam Alerts
  const incidentsData = [
    {
      category: 'taxi_overcharging',
      title: 'Solang Valley Taxi Overcharging Beyond Union Tariff',
      description: 'Drivers demanding ₹3,500 for a one-way trip to Solang Valley snow point, whereas HP Taxi Union rate is fixed at ₹1,800. Insist on prepaid booth receipt.',
      lat: 32.3166,
      lng: 77.1585,
      address: 'Solang Valley Road, Manali, Himachal Pradesh',
      cityName: 'Manali',
      status: 'VERIFIED',
      confidenceScore: 95,
      confirmationsCount: 14,
      amountDemanded: 3500,
      amountPaid: 2000,
      evidenceUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'fake_guide',
      title: 'Unauthorized "Ghat Priest" Asking For Forced Donations',
      description: 'Individuals wearing saffron attire pretending to be official temple trust priests demanding ₹1,100 to ₹5,100 for VIP Ganga Aarti access. Haridwar Mandir trust Aarti is completely free.',
      lat: 29.9561,
      lng: 78.1706,
      address: 'Har Ki Pauri Ghat, Haridwar, Uttarakhand',
      cityName: 'Haridwar',
      status: 'VERIFIED',
      confidenceScore: 92,
      confirmationsCount: 22,
      amountDemanded: 2100,
      amountPaid: 0,
      evidenceUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'fake_tour_operator',
      title: 'Bogus Rafting Permits Near Shivpuri Camp',
      description: 'Fake ticket agent offering ₹400 rafting trips without certified life jackets or Uttarakhand Tourism Board registered rafts. Book only via authorized UTDB counters.',
      lat: 30.1345,
      lng: 78.3888,
      address: 'Shivpuri Badrinath Highway, Rishikesh, Uttarakhand',
      cityName: 'Rishikesh',
      status: 'UNDER_REVIEW',
      confidenceScore: 78,
      confirmationsCount: 7,
      amountDemanded: 800,
      amountPaid: 400,
      evidenceUrl: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'auto_overcharging',
      title: 'Paharganj Exit Rigged Meter Claims',
      description: 'Auto drivers claiming "Delhi traffic jam surcharge" and refusing digital meter, quoting ₹350 for a ₹95 ride to Connaught Place. Traffic Police booth is right next to Gate 1.',
      lat: 28.6428,
      lng: 77.2195,
      address: 'New Delhi Railway Station Paharganj Exit, Delhi',
      cityName: 'Delhi',
      status: 'VERIFIED',
      confidenceScore: 96,
      confirmationsCount: 31,
      amountDemanded: 350,
      amountPaid: 100,
      evidenceUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'shopping_scam',
      title: 'Synthetic "Pashmina" Sold At Real Cashmere Prices',
      description: 'Shop tout redirecting tourists from Hawa Mahal to an unregistered lane store claiming 100% pure Himalayan Pashmina for ₹8,000, which tested as synthetic polyester.',
      lat: 26.9239,
      lng: 75.8267,
      address: 'Johari Bazaar / Badi Chaupar, Jaipur, Rajasthan',
      cityName: 'Jaipur',
      status: 'UNDER_REVIEW',
      confidenceScore: 75,
      confirmationsCount: 9,
      amountDemanded: 8000,
      amountPaid: 3500,
      evidenceUrl: 'https://images.unsplash.com/photo-1606744888344-498238f01740?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'hotel_scam',
      title: 'Fake Sea View Villa Booking Scam Near Calangute',
      description: 'Fraudulent listings on unverified social channels collecting 100% advance deposit via UPI for non-existent beach villas. Verify on official state tourism portals.',
      lat: 15.5439,
      lng: 73.7554,
      address: 'Calangute - Baga Coastal Road, Goa',
      cityName: 'Goa',
      status: 'VERIFIED',
      confidenceScore: 90,
      confirmationsCount: 16,
      amountDemanded: 12000,
      amountPaid: 6000,
      evidenceUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    },
    {
      category: 'theft',
      title: 'Pickpocket Warning at Shimla Ridge Stroll',
      description: 'Group bumping into tourists during sunset hours around Christ Church Ridge. Keep backpacks in front and wallets in secure zipped pockets.',
      lat: 31.1048,
      lng: 77.1734,
      address: 'The Ridge, Mall Road, Shimla, Himachal Pradesh',
      cityName: 'Shimla',
      status: 'PENDING',
      confidenceScore: 65,
      confirmationsCount: 4,
      amountDemanded: null,
      amountPaid: null,
    },
    {
      category: 'unsafe_location',
      title: 'Khardung La Pass Black Ice and Rockfall Risk',
      description: 'Severe black ice early morning between South Pullu and Khardung La top. Two-wheelers without snow chains slipping. Travel only between 10 AM and 3 PM.',
      lat: 34.2787,
      lng: 77.6047,
      address: 'Khardung La Top Highway, Leh Ladakh',
      cityName: 'Leh',
      status: 'VERIFIED',
      confidenceScore: 98,
      confirmationsCount: 28,
      evidenceUrl: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=600&q=80',
    },
  ];

  for (const inc of incidentsData) {
    const cityId = getCityId(inc.cityName);
    await prisma.incidentReport.create({
      data: {
        category: inc.category,
        title: inc.title,
        description: inc.description,
        lat: inc.lat,
        lng: inc.lng,
        address: inc.address,
        cityId,
        status: inc.status,
        confidenceScore: inc.confidenceScore,
        confirmationsCount: inc.confirmationsCount,
        confirmations: inc.confirmationsCount,
        amountDemanded: inc.amountDemanded || null,
        amountPaid: inc.amountPaid || null,
        evidenceUrl: inc.evidenceUrl || null,
        incidentDate: new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${incidentsData.length} Real-Time Incident / Scam Reports`);

  // 2. Seed City-Wise Local Prices
  const pricesData = [
    // MANALI
    { city: 'Manali', category: 'FOOD_DINING', item: 'Traditional Himachali Dham (Full Meal)', min: 180, max: 320, source: 'Local Restaurant Association', ref: 'Old Manali / Mall Rd Benchmark' },
    { city: 'Manali', category: 'STREET_FOOD', item: 'Steamed Tibetan Chicken / Veg Momos (Plate)', min: 80, max: 140, source: 'Tourist Market Standard', ref: 'Mall Road Tibetan Market' },
    { city: 'Manali', category: 'ADVENTURE_ACTIVITY', item: 'Solang Valley High Fly Paragliding (with GoPro)', min: 2500, max: 3500, source: 'HP Tourism Civil Aviation Tariff', ref: 'Official Kullu-Manali Pilot Union' },
    { city: 'Manali', category: 'LOCAL_TRANSPORT', item: 'Royal Enfield Classic 350 Rental / Day', min: 1000, max: 1500, source: 'Manali Bike Rental Union Tariff', ref: 'Vashisht Bike Stand 2024' },
    { city: 'Manali', category: 'HOSTEL', item: 'Backpacker Bunk Bed in Zostel / Hostel', min: 450, max: 850, source: 'Aggregator Average', ref: 'Old Manali Riverside Hostels' },
    { city: 'Manali', category: 'HOTEL_RESORT', item: '3-Star Mountain View Double Room (Per Night)', min: 1800, max: 3800, source: 'Hospitality Index', ref: 'Simsa & Log Huts Area' },
    { city: 'Manali', category: 'PARKING', item: 'Multi-Level Car Parking / 4 Hours', min: 50, max: 100, source: 'Municipal Council Manali', ref: 'Near Circuit House Parking' },

    // RISHIKESH
    { city: 'Rishikesh', category: 'ADVENTURE_ACTIVITY', item: 'Shivpuri to Nim Beach White Water Rafting (16 km)', min: 1000, max: 1500, source: 'Uttarakhand Tourism (UTDB) Tariff', ref: 'Official UTDB Rafting Registry 2024' },
    { city: 'Rishikesh', category: 'ADVENTURE_ACTIVITY', item: 'Mohan Chatti Bungee Jumping (83m Jumpin Heights)', min: 3550, max: 4000, source: 'Certified Operator Tariff', ref: 'Jumpin Heights Fixed Tariff' },
    { city: 'Rishikesh', category: 'FOOD_DINING', item: 'Ayurvedic Thali / Organic Cafe Meal', min: 150, max: 300, source: 'Tapovan Cafe Association', ref: 'Tapovan / Lakshman Jhula Cafes' },
    { city: 'Rishikesh', category: 'LOCAL_TRANSPORT', item: 'Scooter Rental (Honda Activa) / Day', min: 400, max: 600, source: 'Local Rental Standard', ref: 'Tapovan Main Market' },
    { city: 'Rishikesh', category: 'HOSTEL', item: 'Air-Conditioned Dorm Bed Near River', min: 400, max: 750, source: 'Hostel Benchmark', ref: 'Tapovan Backpacker Belt' },

    // HARIDWAR
    { city: 'Haridwar', category: 'STREET_FOOD', item: 'Kachori, Jalebi & Aloo Sabzi (Plate)', min: 40, max: 80, source: 'Heritage Bazaar Rate', ref: 'Bara Bazaar / Moti Bazaar' },
    { city: 'Haridwar', category: 'ATTRACTION_ENTRY', item: 'Mansa Devi Ropeway / Cable Car (Round Trip)', min: 145, max: 185, source: 'Usha Breco Ropeway Fixed Tariff', ref: 'Mansa Devi Udan Khatola Counter' },
    { city: 'Haridwar', category: 'HOTEL_RESORT', item: 'Clean Budget Hotel Double Bed (Ghat Proximity)', min: 800, max: 1800, source: 'Haridwar Hotel Association', ref: 'Railway Station / Upper Road' },

    // DELHI
    { city: 'Delhi', category: 'FOOD_DINING', item: 'Connaught Place Multi-Cuisine Meal For Two', min: 600, max: 1500, source: 'NRAI Benchmark', ref: 'CP Inner Circle Standard' },
    { city: 'Delhi', category: 'STREET_FOOD', item: 'Chandni Chowk Stuffed Paratha / Chole Bhature', min: 60, max: 140, source: 'Heritage Food Guild', ref: 'Paranthe Wali Gali & Gali Paranthe' },
    { city: 'Delhi', category: 'ATTRACTION_ENTRY', item: 'Red Fort / Qutub Minar Indian National Ticket', min: 50, max: 50, source: 'Archaeological Survey of India (ASI)', ref: 'Official ASI E-Ticket Portal 2024' },
    { city: 'Delhi', category: 'ATTRACTION_ENTRY', item: 'Red Fort Foreign Tourist Entry Ticket', min: 550, max: 600, source: 'ASI Govt Notification', ref: 'ASI International Rate' },
    { city: 'Delhi', category: 'LOCAL_TRANSPORT', item: 'Metro Day Tourist Pass (Unlimited Rides)', min: 200, max: 200, source: 'DMRC Official Circular', ref: 'Delhi Metro Rail Corp 2024' },
    { city: 'Delhi', category: 'PARKING', item: 'NDMC Connaught Place Surface Parking / Hr', min: 20, max: 40, source: 'NDMC Civic Agency Tariff', ref: 'Palika Parking Outer Circle' },

    // JAIPUR
    { city: 'Jaipur', category: 'ATTRACTION_ENTRY', item: 'Amber Palace Composite Ticket (7 Monuments)', min: 100, max: 300, source: 'Dept of Archaeology & Museums Rajasthan', ref: 'Jaipur Monument Composite Pass' },
    { city: 'Jaipur', category: 'FOOD_DINING', item: 'Authentic Dal Baati Churma Thali', min: 250, max: 550, source: 'Rajasthan Tourism Guild', ref: 'MI Road / Chokhi Dhani Rates' },
    { city: 'Jaipur', category: 'LOCAL_SHOPPING', item: 'Jaipuri Hand Block Print Cotton Quilt (Razai)', min: 800, max: 2200, source: 'Jaipur Crafts Guild', ref: 'Bapu Bazaar Verified Cooperatives' },
    { city: 'Jaipur', category: 'LOCAL_TRANSPORT', item: 'Full Day City Tour Auto Rickshaw (6 Hours)', min: 600, max: 900, source: 'Jaipur Traffic Police Prepaid Booth', ref: 'Railway Station Auto Booth' },

    // GOA
    { city: 'Goa', category: 'ADVENTURE_ACTIVITY', item: 'Grande Island Scuba Diving with Photos & Boat', min: 2200, max: 3500, source: 'PADI Verified Watersports Union', ref: 'Baga / Calangute Watersports Counter' },
    { city: 'Goa', category: 'LOCAL_TRANSPORT', item: 'Honda Activa Scooter Rental (Per 24h Non-Peak)', min: 350, max: 550, source: 'Goa Rent-A-Bike Association', ref: 'Anjuna / Candolim Stand' },
    { city: 'Goa', category: 'LOCAL_TRANSPORT', item: 'Thar / Open Jeep Rental (Per 24 Hours)', min: 2500, max: 4000, source: 'Goa Self-Drive Association', ref: 'Panaji / Mapusa Authorized Fleets' },
    { city: 'Goa', category: 'FOOD_DINING', item: 'Beach Shack Goan Fish Curry Thali', min: 220, max: 450, source: 'Goa Shack Owners Union', ref: 'Morjim & Palolem Shacks' },
    { city: 'Goa', category: 'HOSTEL', item: 'Social Backpacker Dorm Bed in Anjuna / Vagator', min: 500, max: 1100, source: 'Hostelworld Benchmark', ref: 'North Goa Coastal Belt' },

    // LEH LADAKH
    { city: 'Leh', category: 'ATTRACTION_ENTRY', item: 'Inner Line Permit (ILP) + Environmental Fee', min: 450, max: 600, source: 'LAHDCL Official Portal', ref: 'Leh Administration Portal 2024' },
    { city: 'Leh', category: 'LOCAL_TRANSPORT', item: 'Royal Enfield Himalayan Rental / Day for Pangong', min: 1600, max: 2200, source: 'Ladakh Bike Rental Association', ref: 'Changspa Road Verified Stand' },
    { city: 'Leh', category: 'FOOD_DINING', item: 'Ladakhi Thukpa / Tingmo Meal in Main Bazaar', min: 140, max: 280, source: 'Leh Restaurant Guild', ref: 'Main Bazaar Leh Old Town' },
    { city: 'Leh', category: 'HOTEL_RESORT', item: 'Traditional Ladakhi Guesthouse with Heated Bed', min: 1500, max: 3200, source: 'All Ladakh Guesthouse Association', ref: 'Upper Tukcha Road' },

    // SHIMLA
    { city: 'Shimla', category: 'ATTRACTION_ENTRY', item: 'Jakhoo Ropeway Cable Car (Two-Way)', min: 550, max: 600, source: 'Jakhoo Temple Ropeway Fixed Rate', ref: 'Mall Road Counter' },
    { city: 'Shimla', category: 'LOCAL_TRANSPORT', item: 'Prepaid Tourist Taxi to Kufri / Fagu (Round Trip)', min: 1400, max: 1900, source: 'Shimla Tourist Taxi Union Tariff', ref: 'Victory Tunnel Taxi Stand' },
    { city: 'Shimla', category: 'FOOD_DINING', item: 'Heritage Cafe Coffee & Bakery on Mall Road', min: 180, max: 380, source: 'Mall Road Merchant Guild', ref: 'The Mall Heritage Bakery' },
  ];

  for (const pr of pricesData) {
    const cityId = getCityId(pr.city);
    await prisma.priceRecord.create({
      data: {
        cityId,
        category: pr.category,
        itemName: pr.item,
        minPrice: pr.min,
        maxPrice: pr.max,
        currency: 'INR (₹)',
        sourceType: 'OFFICIAL_BENCHMARK',
        sourceReference: pr.ref,
        notes: `Benchmarked through ${pr.source}. Validated against non-inflated tourist rates.`,
        verificationStatus: 'VERIFIED',
      },
    });
  }
  console.log(`✅ Seeded ${pricesData.length} City-Wise Local Price Records`);

  console.log('🎉 Seed prices and alerts completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
