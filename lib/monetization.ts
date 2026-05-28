// lib/monetization.ts
// Static registry of all managed sites — affiliate programs, digital products, AI cost estimates.
// Edit this file to update monetization data for any site.

// ── Types ─────────────────────────────────────────────────────────────────────

export type AffiliateStatus = 'active' | 'pending-signup' | 'not-signed-up'

export interface AffiliateProgram {
  id: string
  name: string
  category: 'gear' | 'accommodation' | 'insurance' | 'activities' | 'automotive' | 'medical' | 'language' | 'other'
  envVar: string
  commission: string
  paymentThreshold: string
  signupUrl: string
  cookieDays: number
  instructions: string
  notes: string
}

export interface DigitalProduct {
  id: string
  name: string
  description: string
  type: 'pdf-guide' | 'route-map' | 'season-guide' | 'course' | 'subscription'
  suggestedPrice: number
  stripeProductId?: string
  gumroadUrl?: string
  status: 'live' | 'planned' | 'template-ready'
  envVar?: string
  notes: string
}

export interface AICostEstimate {
  buildSessions: number
  avgTokensPerSession: number
  buildCostUSD: number
  monthlyMaintSessions: number
  monthlyMaintCostUSD: number
  billingNotes: string
}

export interface SiteMonetization {
  siteKey: string
  siteName: string
  siteUrl: string
  siteType:
    | 'climbing-guide'
    | 'auto-repair'
    | 'logistics'
    | 'medical-education'
    | 'language-saas'
    | 'marketing'
    | 'management'
  affiliates: AffiliateProgram[]
  products: DigitalProduct[]
  aiCost: AICostEstimate
  opportunityAudit: string[]
}

// ── Shared affiliate programs ─────────────────────────────────────────────────

const AMAZON_ASSOCIATES: AffiliateProgram = {
  id: 'amazon',
  name: 'Amazon Associates',
  category: 'gear',
  envVar: 'AMAZON_AFFILIATE_TAG',
  commission: '3–10% on gear, outdoor, and sporting categories',
  paymentThreshold: '$10 minimum payout',
  signupUrl: 'https://affiliate-program.amazon.com',
  cookieDays: 1,
  instructions:
    '1. Create an Amazon Associates account at affiliate-program.amazon.com. ' +
    '2. Complete the profile and website/app description. ' +
    '3. Once approved, go to Account Settings → Manage Your Tracking IDs. ' +
    '4. Copy your default Tracking ID (e.g. climbidaho-20) and set it as AMAZON_AFFILIATE_TAG.',
  notes:
    '24-hour cookie window — short but Amazon converts at high rates. ' +
    'Best for linking specific gear (harnesses, shoes, cams, draws). ' +
    'Add tag= parameter to any product URL: ?tag=AMAZON_AFFILIATE_TAG.',
}

const REI_AFFILIATE: AffiliateProgram = {
  id: 'rei',
  name: 'REI Affiliate Program',
  category: 'gear',
  envVar: 'REI_AFFILIATE_CODE',
  commission: '5% on most products',
  paymentThreshold: '$25 minimum payout via Impact Radius',
  signupUrl: 'https://www.rei.com/cs/help/affiliate-program',
  cookieDays: 30,
  instructions:
    '1. Visit rei.com/cs/help/affiliate-program and click Apply. ' +
    '2. Sign up for an Impact Radius account (the network REI uses). ' +
    '3. Once approved (~3–5 business days), navigate to Ads → Links in Impact. ' +
    '4. Grab your unique publisher subid — set it as REI_AFFILIATE_CODE.',
  notes:
    '30-day cookie. REI is a trusted brand climbers already know. ' +
    'Great for harnesses, shoes, crash pads, and camping gear bundles.',
}

const BOOKING_AFFILIATE: AffiliateProgram = {
  id: 'booking',
  name: 'Booking.com Affiliate',
  category: 'accommodation',
  envVar: 'BOOKING_AID',
  commission: '25–40% of Booking\'s commission (typically 3–6% of booking value)',
  paymentThreshold: '€100 minimum, paid monthly',
  signupUrl: 'https://www.booking.com/affiliate-program/sign-up.html',
  cookieDays: 30,
  instructions:
    '1. Go to booking.com/affiliate-program/sign-up.html and create an affiliate account. ' +
    '2. Submit site details and wait for approval (usually 24–48h). ' +
    '3. Log in to the Affiliate Partner Center dashboard. ' +
    '4. Find your AID (numeric Affiliate ID) in Account → Profile — set as BOOKING_AID.',
  notes:
    'Numeric AID replaces the placeholder in deep-link URLs: ' +
    'https://www.booking.com/searchresults.html?aid=BOOKING_AID&ss=City+Name. ' +
    'High conversion — accommodations are essential for any climbing trip.',
}

const WORLD_NOMADS_AFFILIATE: AffiliateProgram = {
  id: 'world-nomads',
  name: 'World Nomads Travel Insurance',
  category: 'insurance',
  envVar: 'WORLD_NOMADS_AFFILIATE_ID',
  commission: '$15–25 per policy sold',
  paymentThreshold: '$50 minimum payout',
  signupUrl: 'https://www.worldnomads.com/affiliate',
  cookieDays: 30,
  instructions:
    '1. Apply at worldnomads.com/affiliate — fill out the partner form. ' +
    '2. World Nomads reviews applications manually; expect 3–7 business days. ' +
    '3. On approval, log in to the affiliate portal and copy your affiliate ID. ' +
    '4. Set it as WORLD_NOMADS_AFFILIATE_ID — used in the widget embed code and deep links.',
  notes:
    'Fixed commission per policy, not percentage. ' +
    'Climbers are high-intent buyers for adventure travel insurance. ' +
    'Embed the quote widget directly on the site for best conversion.',
}

const GETYOURGUIDE_AFFILIATE: AffiliateProgram = {
  id: 'getyourguide',
  name: 'GetYourGuide Activities',
  category: 'activities',
  envVar: 'GETYOURGUIDE_PARTNER_ID',
  commission: '8% on all bookings',
  paymentThreshold: '€50 minimum payout',
  signupUrl: 'https://partner.getyourguide.com',
  cookieDays: 30,
  instructions:
    '1. Apply at partner.getyourguide.com/affiliate. ' +
    '2. Once approved, navigate to Monetize → Affiliate in the partner dashboard. ' +
    '3. Copy your Partner ID from the URL parameters in your tracking links. ' +
    '4. Set it as GETYOURGUIDE_PARTNER_ID — use in activity search widget embeds.',
  notes:
    'Great for guided climbing tours, via ferrata experiences, rappelling tours. ' +
    'Embed activity widgets filtered by destination city for best relevance.',
}

const GAIA_GPS_AFFILIATE: AffiliateProgram = {
  id: 'gaia-gps',
  name: 'Gaia GPS (via ShareASale)',
  category: 'activities',
  envVar: 'GAIA_GPS_AFFILIATE_CODE',
  commission: '20–30% on new subscriptions ($3.99–5.99 per sale)',
  paymentThreshold: '$50 minimum payout via ShareASale',
  signupUrl: 'https://www.shareasale.com/info/index.cfm?program=gaia',
  cookieDays: 30,
  instructions:
    '1. Create a ShareASale publisher account at shareasale.com/shareasale.cfm. ' +
    '2. Search for "Gaia GPS" in the merchant directory and click Apply. ' +
    '3. Once approved, go to Links → Get a Link for a standard tracking link. ' +
    '4. Extract your affiliate code from the link parameters — set as GAIA_GPS_AFFILIATE_CODE.',
  notes:
    'Gaia GPS is the go-to mapping app for climbers and hikers. ' +
    'Subscription product = recurring commission potential on renewals. ' +
    'Best placement: "Download your offline maps" CTA near route descriptions.',
}

const LANGUAGE_THRESHOLD_AFFILIATE: AffiliateProgram = {
  id: 'language-threshold',
  name: 'Language Threshold (Cross-Promotion)',
  category: 'language',
  envVar: 'LANGUAGE_THRESHOLD_REF',
  commission: 'TBD — negotiated revenue share',
  paymentThreshold: 'TBD',
  signupUrl: 'https://language-threshold.com',
  cookieDays: 30,
  instructions:
    '1. Contact Language Threshold directly to set up a referral partnership. ' +
    '2. Agree on commission rate and tracking method. ' +
    '3. Obtain your referral code from the partner dashboard. ' +
    '4. Set it as LANGUAGE_THRESHOLD_REF — used in cross-site referral links.',
  notes:
    'Internal cross-promotion between climbing sites and Language Threshold. ' +
    'Target audience: international climbers learning the local language. ' +
    'Add a "Learn French for your trip" CTA on Climb France, Spanish on Climb Spain, etc.',
}

/** Full shared affiliate stack for all climbing guide sites */
const CLIMBING_AFFILIATES: AffiliateProgram[] = [
  AMAZON_ASSOCIATES,
  REI_AFFILIATE,
  BOOKING_AFFILIATE,
  WORLD_NOMADS_AFFILIATE,
  GETYOURGUIDE_AFFILIATE,
  GAIA_GPS_AFFILIATE,
  LANGUAGE_THRESHOLD_AFFILIATE,
]

/** Standard opportunity audit items shared across all climbing sites */
const CLIMBING_OPPORTUNITY_AUDIT: string[] = [
  'Set up Gumroad store and link PDF products from site navigation',
  'Add email capture form for newsletter / beta PDF early-access offers',
  'Add Google AdSense (low priority — conflicts with premium editorial aesthetic)',
  'Explore MountainProject sponsor integration or partner badge',
  'Add sponsor banner slot for local gear shop (city-specific)',
  'Create trip planning inquiry form with paid consultation upsell',
  'Connect Language Threshold cross-promotion for multilingual climbers',
  'Add Gaia GPS widget embed on route description pages',
  'Set up GetYourGuide activity widget filtered to destination region',
  'Create seasonal email campaign tied to climbing season open/close',
  'Add affiliate disclosure page (required by FTC and most programs)',
]

// ── Site monetization data ────────────────────────────────────────────────────

const CLIMB_IDAHO: SiteMonetization = {
  siteKey: 'climb-idaho',
  siteName: 'Climb Idaho',
  siteUrl: 'https://climbidaho.com',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-idaho-pdf-guide',
      name: 'City of Rocks Climbing Guide PDF',
      description:
        'Comprehensive printable guide to City of Rocks — grades, approach notes, ' +
        'topo sketches, and seasonal conditions for 400+ routes.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_IDAHO_GUIDE_URL',
      notes: 'Ready to produce once area info is finalized. Sell via Gumroad.',
    },
    {
      id: 'climb-idaho-route-map',
      name: 'Idaho Climbing Route Map',
      description:
        'Printable PDF map showing major climbing areas across Idaho — City of Rocks, ' +
        'Massacre Rocks, Craters of the Moon, and more.',
      type: 'route-map',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_IDAHO_MAP_URL',
      notes: 'Simpler product, faster to produce. Good entry-point price point.',
    },
  ],
  aiCost: {
    buildSessions: 20,
    avgTokensPerSession: 300_000,
    buildCostUSD: 64,
    monthlyMaintSessions: 3,
    monthlyMaintCostUSD: 8,
    billingNotes:
      'Complex 3D mountain hero (R3F), full affiliate integration, and SEO content depth ' +
      'drove higher build cost. Maintenance covers seasonal content updates and affiliate link audits.',
  },
  opportunityAudit: CLIMBING_OPPORTUNITY_AUDIT,
}

const CLIMB_BRASIL: SiteMonetization = {
  siteKey: 'climb-brasil',
  siteName: 'Climb Brasil',
  siteUrl: 'https://climbbrasil.com',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-brasil-pdf-guide',
      name: 'Pedra da Gávea Climbing Guide PDF',
      description:
        'Printable guide to Rio\'s iconic crags — route grades (Brazilian scale + Yosemite conversion), ' +
        'approach notes, access info, and seasonal conditions.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_BRASIL_GUIDE_URL',
      notes: 'Dual-language (PT/EN) version adds value. Sell via Gumroad.',
    },
    {
      id: 'climb-brasil-route-map',
      name: 'Brazil Climbing Destination Map',
      description:
        'Printable PDF map of Brazil\'s major climbing areas — Rio, Belo Horizonte, Serra da Canastra, Chapada Diamantina.',
      type: 'route-map',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_BRASIL_MAP_URL',
      notes: 'Broad destination overview — good for international climbers planning their first Brazil trip.',
    },
  ],
  aiCost: {
    buildSessions: 12,
    avgTokensPerSession: 300_000,
    buildCostUSD: 38,
    monthlyMaintSessions: 2,
    monthlyMaintCostUSD: 5,
    billingNotes:
      'Mid-tier build. Portuguese content required research; otherwise standard climbing site stack.',
  },
  opportunityAudit: CLIMBING_OPPORTUNITY_AUDIT,
}

const CLIMB_FRANCE: SiteMonetization = {
  siteKey: 'climb-france',
  siteName: 'Climb France',
  siteUrl: 'https://climb-france.vercel.app',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-france-pdf-guide',
      name: 'Gorges du Verdon Climbing Guide PDF',
      description:
        'Printable guide to France\'s premier sport climbing destination — ' +
        'route descriptions, sector maps, approach topos, and seasonal weather notes.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_FRANCE_GUIDE_URL',
      notes:
        'Triple-language edition (EN/FR/DE) would command a premium. ' +
        'Verdon has international climber demand.',
    },
    {
      id: 'climb-france-season-guide',
      name: 'When to Climb in France — Season Guide PDF',
      description:
        'Month-by-month conditions guide for all major French climbing regions — ' +
        'Céüse, Verdon, Calanques, Fontainebleau, Ardèche.',
      type: 'season-guide',
      suggestedPrice: 4.99,
      status: 'planned',
      envVar: 'GUMROAD_CLIMB_FRANCE_SEASON_URL',
      notes: 'Evergreen product. High search intent around "when to climb France".',
    },
  ],
  aiCost: {
    buildSessions: 14,
    avgTokensPerSession: 300_000,
    buildCostUSD: 45,
    monthlyMaintSessions: 2,
    monthlyMaintCostUSD: 5,
    billingNotes:
      'i18n complexity (3 languages) added ~2 extra sessions. ' +
      'Language Threshold cross-promotion is already partially implemented.',
  },
  opportunityAudit: [
    ...CLIMBING_OPPORTUNITY_AUDIT,
    'Leverage Language Threshold integration already in codebase — complete the cross-promo flow',
    'Add French-specific affiliate programs (Alltricks for gear, Decathlon affiliate)',
    'Explore Airbnb affiliate program for accommodation (France has strong Airbnb supply)',
  ],
}

const CLIMB_SPAIN: SiteMonetization = {
  siteKey: 'climb-spain',
  siteName: 'Climb Spain',
  siteUrl: 'https://climbspain.com',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-spain-pdf-guide',
      name: 'Costa Blanca Climbing Guide PDF',
      description:
        'Printable guide to Spain\'s most popular winter climbing destination — ' +
        'Gandia, Guadalest, Calpe, and surrounding crags.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_SPAIN_GUIDE_URL',
      notes: 'Costa Blanca is a top destination for UK and north European winter sun climbers.',
    },
    {
      id: 'climb-spain-route-map',
      name: 'Spain Climbing Destination Map',
      description:
        'Printable PDF map of Spain\'s major climbing areas — Costa Blanca, Siurana, Chulilla, El Chorro.',
      type: 'route-map',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_SPAIN_MAP_URL',
      notes: 'Good overview product for climbers doing a multi-area Spain trip.',
    },
  ],
  aiCost: {
    buildSessions: 8,
    avgTokensPerSession: 300_000,
    buildCostUSD: 26,
    monthlyMaintSessions: 1,
    monthlyMaintCostUSD: 4,
    billingNotes: 'Standard build. No special complexity beyond localized content.',
  },
  opportunityAudit: [
    ...CLIMBING_OPPORTUNITY_AUDIT,
    'Add Spanish-specific accommodation affiliates (HolaLuz, Rusticae for rural stays)',
    'Add Language Threshold Spanish cross-promo — high language-learning demand from US climbers visiting Spain',
  ],
}

const CLIMB_UTAH: SiteMonetization = {
  siteKey: 'climb-utah',
  siteName: 'Climb Utah',
  siteUrl: 'https://climbutah.com',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-utah-pdf-guide',
      name: 'Red Rock / St George Climbing Guide PDF',
      description:
        'Printable guide to southern Utah sandstone climbing — Wall Street, ' +
        'Cougar Cliffs, Black Rocks, and more. Includes access and camping info.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_UTAH_GUIDE_URL',
      notes: 'Phase 1 pilot site. Good candidate for first live Gumroad product launch.',
    },
    {
      id: 'climb-utah-route-map',
      name: 'Utah Climbing Area Map',
      description:
        'Printable PDF map of Utah\'s climbing regions — Red Rock, Maple Canyon, Joe\'s Valley, Uintas.',
      type: 'route-map',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_UTAH_MAP_URL',
      notes: 'Utah has strong climbing tourism from SLC airport proximity.',
    },
  ],
  aiCost: {
    buildSessions: 8,
    avgTokensPerSession: 300_000,
    buildCostUSD: 26,
    monthlyMaintSessions: 1,
    monthlyMaintCostUSD: 4,
    billingNotes: 'Pilot site — standard build complexity.',
  },
  opportunityAudit: CLIMBING_OPPORTUNITY_AUDIT,
}

const CLIMB_KALYMNOS: SiteMonetization = {
  siteKey: 'climb-kalymnos',
  siteName: 'Climb Kalymnos',
  siteUrl: 'https://climbkalymnos.com',
  siteType: 'climbing-guide',
  affiliates: CLIMBING_AFFILIATES,
  products: [
    {
      id: 'climb-kalymnos-pdf-guide',
      name: 'Kalymnos Sport Climbing Guide PDF',
      description:
        'Printable guide to Kalymnos — sector maps, route descriptions, ' +
        'travel tips, and ferry schedule reference. The essential pre-trip document.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_CLIMB_KALYMNOS_GUIDE_URL',
      notes:
        'Kalymnos is a bucket-list destination with high international traffic. ' +
        'Strong multi-language demand (DE, IT, FR, EN).',
    },
    {
      id: 'climb-kalymnos-season-guide',
      name: 'Kalymnos Trip Planning Guide PDF',
      description:
        'Practical trip planning PDF — when to go, how to get there, where to stay, ' +
        'what gear to bring, climbing etiquette, and ferry schedules.',
      type: 'season-guide',
      suggestedPrice: 4.99,
      status: 'planned',
      envVar: 'GUMROAD_CLIMB_KALYMNOS_TRIP_URL',
      notes:
        'Trip planning content has high search intent. ' +
        'Pairs well with Booking.com and World Nomads affiliate links.',
    },
  ],
  aiCost: {
    buildSessions: 8,
    avgTokensPerSession: 300_000,
    buildCostUSD: 26,
    monthlyMaintSessions: 1,
    monthlyMaintCostUSD: 4,
    billingNotes: 'Standard build. Greek island destination content required extra research.',
  },
  opportunityAudit: [
    ...CLIMBING_OPPORTUNITY_AUDIT,
    'Add Greek domestic ferry affiliate or booking widget (Ferryhopper affiliate program)',
    'Add local climbing school / guide service partner links',
    'High multi-language potential — add GetYourGuide guided climbing tours widget',
  ],
}

const JRS_AUTO_REPAIR: SiteMonetization = {
  siteKey: 'jrs-auto-repair',
  siteName: 'JRS Auto Repair',
  siteUrl: 'https://jrsautorepair.worker-bee.app',
  siteType: 'auto-repair',
  affiliates: [
    {
      id: 'autozone',
      name: 'AutoZone Affiliate',
      category: 'automotive',
      envVar: 'AUTOZONE_AFFILIATE_ID',
      commission: '2–5% on parts and accessories',
      paymentThreshold: '$25 minimum payout',
      signupUrl: 'https://www.autozone.com/affiliates',
      cookieDays: 14,
      instructions:
        '1. Visit autozone.com/affiliates and apply with the shop website. ' +
        '2. AutoZone runs their program via Commission Junction (CJ Affiliate). ' +
        '3. Create a CJ publisher account at cj.com if you don\'t have one. ' +
        '4. Once approved, copy your CJ publisher ID — set as AUTOZONE_AFFILIATE_ID.',
      notes:
        'AutoZone is the most recognized parts brand in Twin Falls. ' +
        'Best use: "DIY parts list" pages or maintenance reminder blog posts.',
    },
    {
      id: 'napa-auto-parts',
      name: 'NAPA Auto Parts Affiliate',
      category: 'automotive',
      envVar: 'NAPA_AFFILIATE_CODE',
      commission: '3–6% on parts',
      paymentThreshold: '$25 minimum payout',
      signupUrl: 'https://www.napaonline.com/en/affiliate',
      cookieDays: 30,
      instructions:
        '1. Apply at napaonline.com/en/affiliate — program runs through Impact Radius. ' +
        '2. Create an Impact Radius publisher account at impact.com. ' +
        '3. Search for NAPA and apply to their program. ' +
        '4. Once approved, copy your publisher subid — set as NAPA_AFFILIATE_CODE.',
      notes: '30-day cookie. NAPA has strong brand recognition in Idaho.',
    },
    {
      id: 'cargurus',
      name: 'CarGurus Lead Generation',
      category: 'automotive',
      envVar: 'CARGURUS_PARTNER_ID',
      commission: '$10–25 per qualified dealer lead',
      paymentThreshold: '$50 minimum payout',
      signupUrl: 'https://www.cargurus.com/Cars/affiliates/',
      cookieDays: 30,
      instructions:
        '1. Apply at cargurus.com/Cars/affiliates. ' +
        '2. CarGurus reviews automotive service partners manually. ' +
        '3. Once approved, you receive a Partner ID in the affiliate portal. ' +
        '4. Set it as CARGURUS_PARTNER_ID — use in "vehicle lookup" or buying guide CTAs.',
      notes:
        'Lead gen model — fixed payout per lead, not percentage. ' +
        'Good fit for "thinking of selling your car?" content.',
    },
    {
      id: 'progressive-insurance',
      name: 'Progressive Insurance (EmbedIt)',
      category: 'automotive',
      envVar: 'PROGRESSIVE_AFFILIATE_CODE',
      commission: '$25–50 per policy sold',
      paymentThreshold: '$50 minimum payout',
      signupUrl: 'https://www.progressiveagent.com/affiliate',
      cookieDays: 30,
      instructions:
        '1. Apply at progressiveagent.com/affiliate or search for Progressive in CJ Affiliate. ' +
        '2. Progressive also runs EmbedIt — a white-label quoting widget. ' +
        '3. Once approved, get your unique code from the affiliate dashboard. ' +
        '4. Set as PROGRESSIVE_AFFILIATE_CODE — use in the insurance comparison widget.',
      notes:
        'High fixed commission per policy. ' +
        'Auto repair shops are a natural cross-sell for insurance — especially after accidents.',
    },
    {
      id: 'goodyear',
      name: 'Goodyear Tires Affiliate',
      category: 'automotive',
      envVar: 'GOODYEAR_AFFILIATE_CODE',
      commission: '3–5% on tire sales',
      paymentThreshold: '$25 minimum payout',
      signupUrl: 'https://www.goodyear.com/dealers',
      cookieDays: 14,
      instructions:
        '1. Contact Goodyear via the dealer portal at goodyear.com/dealers. ' +
        '2. Ask about their affiliate or referral program for service partners. ' +
        '3. If they use a network (CJ or Rakuten), sign up through that. ' +
        '4. Once approved, set your tracking code as GOODYEAR_AFFILIATE_CODE.',
      notes:
        'Tire referrals are a high-value transaction. ' +
        'Even without a formal affiliate code, a Goodyear partner badge adds trust.',
    },
  ],
  products: [
    {
      id: 'jrs-vehicle-inspection-checklist',
      name: 'Digital Vehicle Inspection Checklist PDF',
      description:
        'Printable 3-page vehicle inspection checklist for DIY mechanics and car buyers — ' +
        'covers all major systems with pass/fail boxes and notes fields.',
      type: 'pdf-guide',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_JRS_CHECKLIST_URL',
      notes: 'Quick win. Low effort to produce, high perceived value for car buyers.',
    },
    {
      id: 'jrs-maintenance-schedule',
      name: 'Vehicle Maintenance Schedule Template PDF',
      description:
        '12-month vehicle maintenance tracking template — oil changes, tire rotations, ' +
        'filters, fluids, and inspection reminders with mileage tracking.',
      type: 'pdf-guide',
      suggestedPrice: 2.99,
      status: 'template-ready',
      envVar: 'GUMROAD_JRS_MAINTENANCE_URL',
      notes: 'Good entry-point product. Email capture offer: "Free if you subscribe."',
    },
  ],
  aiCost: {
    buildSessions: 35,
    avgTokensPerSession: 300_000,
    buildCostUSD: 112,
    monthlyMaintSessions: 5,
    monthlyMaintCostUSD: 16,
    billingNotes:
      'Highest build cost — Supabase auth (dual /admin + /portal), Vitest test suite, ' +
      'articles system, cron jobs, and full booking flow drove session count. ' +
      'Monthly maintenance covers content updates, appointment flow, and test runs.',
  },
  opportunityAudit: [
    'Set up online booking widget (Calendly embed or custom Supabase scheduler)',
    'Add parts markup policy page — customers supplying own parts should be addressed explicitly',
    'Create loyalty program — punch card or points system via Supabase',
    'Add Google review funnel — redirect happy customers directly to Google Maps review form',
    'Add "get a quote" form with automated Resend email response',
    'Set up AutoZone and NAPA affiliate links in blog post content',
    'Add vehicle health report PDF — upsell after inspection (Stripe checkout)',
  ],
}

const SILVER_CREEK_LOGISTICS: SiteMonetization = {
  siteKey: 'silver-creek-logistics',
  siteName: 'Silver Creek Logistics',
  siteUrl: 'https://silvercreeklogistics.worker-bee.app',
  siteType: 'logistics',
  affiliates: [
    {
      id: 'geotab',
      name: 'Geotab Fleet GPS (Reseller)',
      category: 'other',
      envVar: 'GEOTAB_RESELLER_CODE',
      commission: 'Reseller margin — typically 15–25% on device/subscription sales',
      paymentThreshold: 'Direct invoicing through Geotab reseller program',
      signupUrl: 'https://www.geotab.com/partners/',
      cookieDays: 0,
      instructions:
        '1. Apply to the Geotab Reseller Program at geotab.com/partners. ' +
        '2. Complete partner certification (online training modules). ' +
        '3. Once approved, you get a reseller portal with your partner code. ' +
        '4. Set as GEOTAB_RESELLER_CODE — reference in fleet management upsell CTAs.',
      notes:
        'Not a traditional affiliate — this is a reseller relationship. ' +
        'High margin per device + recurring subscription revenue. ' +
        'Best positioned as a "fleet management upgrade" service offering.',
    },
    {
      id: 'wex-fleet',
      name: 'WEX Fleet Cards (Referral)',
      category: 'other',
      envVar: 'WEX_REFERRAL_CODE',
      commission: 'Referral bonus — typically $50–200 per account opened',
      paymentThreshold: '$50 minimum',
      signupUrl: 'https://www.wexinc.com/solutions/fleet-cards/',
      cookieDays: 30,
      instructions:
        '1. Contact WEX at wexinc.com/solutions/fleet-cards and ask about the referral program. ' +
        '2. WEX may have an agent/partner program — apply through their sales team. ' +
        '3. Get a referral tracking link or code. ' +
        '4. Set as WEX_REFERRAL_CODE — use in fleet cost management content.',
      notes:
        'Fleet fuel cards reduce fuel cost for clients — natural upsell for logistics companies. ' +
        'Referral income is secondary; primary value is client retention.',
    },
    {
      id: 'uline',
      name: 'Uline Equipment (Affiliate)',
      category: 'other',
      envVar: 'ULINE_AFFILIATE_CODE',
      commission: '2–4% on shipping supplies and equipment',
      paymentThreshold: '$25 minimum',
      signupUrl: 'https://www.uline.com/BL_800/Affiliate-Program',
      cookieDays: 30,
      instructions:
        '1. Apply at uline.com/BL_800/Affiliate-Program. ' +
        '2. Uline runs via AvantLink network — create a publisher account at avantlink.com. ' +
        '3. Apply to Uline in the merchant directory. ' +
        '4. Once approved, set your tracking code as ULINE_AFFILIATE_CODE.',
      notes:
        'Shipping supplies and warehouse equipment. Relevant for logistics clients. ' +
        'Low commission but consistent if embedded in "recommended equipment" content.',
    },
    {
      id: 'transport-insurance',
      name: 'Transport Insurance Affiliate',
      category: 'insurance',
      envVar: 'TRANSPORT_INS_AFFILIATE_ID',
      commission: '$50–150 per policy referral',
      paymentThreshold: '$100 minimum',
      signupUrl: 'https://www.progressivecommercial.com/affiliates/',
      cookieDays: 30,
      instructions:
        '1. Apply to Progressive Commercial at progressivecommercial.com/affiliates. ' +
        '2. Alternatively, explore transport-specific brokers like Carriers Insurance Group. ' +
        '3. Once approved, get your unique affiliate or referral link. ' +
        '4. Set as TRANSPORT_INS_AFFILIATE_ID.',
      notes:
        'Commercial transport insurance is a compliance requirement — high-value referral. ' +
        'Natural placement: "Is your fleet properly insured?" CTA on driver compliance pages.',
    },
  ],
  products: [
    {
      id: 'scl-driver-onboarding',
      name: 'Driver Onboarding PDF Packet',
      description:
        '20-page driver onboarding packet — company policies, route protocols, ' +
        'incident reporting procedures, and signature pages. Editable template.',
      type: 'pdf-guide',
      suggestedPrice: 9.99,
      status: 'template-ready',
      envVar: 'GUMROAD_SCL_ONBOARDING_URL',
      notes:
        'Sell to other small logistics companies who need professional onboarding materials. ' +
        'This is a B2B product with search demand from logistics operators.',
    },
    {
      id: 'scl-dot-compliance',
      name: 'DOT Compliance Checklist PDF',
      description:
        'Printable DOT compliance checklist for small trucking fleets — ' +
        'vehicle inspection requirements, driver log rules, and FMCSA filing guide.',
      type: 'pdf-guide',
      suggestedPrice: 4.99,
      status: 'template-ready',
      envVar: 'GUMROAD_SCL_DOT_URL',
      notes:
        'High search intent for "DOT compliance checklist". ' +
        'Good lead magnet — offer free version for email capture, paid for full version.',
    },
  ],
  aiCost: {
    buildSessions: 20,
    avgTokensPerSession: 300_000,
    buildCostUSD: 64,
    monthlyMaintSessions: 3,
    monthlyMaintCostUSD: 10,
    billingNotes:
      'Same dual-auth architecture as JRS (reused patterns reduced cost). ' +
      'Driver dispatch, cron notifications, and Supabase tables for routes and jobs ' +
      'were the main complexity drivers.',
  },
  opportunityAudit: [
    'Build per-delivery commission tracking page in /admin (log revenue per route)',
    'Create client referral program with tracking — "refer another business, get 1 month free"',
    'Add fleet maintenance log feature — upsell from driver portal',
    'Explore freight broker affiliate programs (uShip, Convoy)',
    'Add rate calculator tool — turns content into lead gen with email capture',
    'Sell DOT compliance checklist on Gumroad — B2B logistics niche with real demand',
  ],
}

const ORTHOBIOLOGIC_PATHWAYS: SiteMonetization = {
  siteKey: 'orthobiologic-pathways',
  siteName: 'Orthobiologic Pathways',
  siteUrl: 'https://orthobiologicpathways.com',
  siteType: 'medical-education',
  affiliates: [
    {
      id: 'medscape-ads',
      name: 'Medscape / WebMD Health CME Advertising',
      category: 'medical',
      envVar: 'MEDSCAPE_PUBLISHER_ID',
      commission: 'CPM-based — typically $5–15 CPM for medical audiences',
      paymentThreshold: '$100 minimum payout',
      signupUrl: 'https://www.medscape.com/public/advertising',
      cookieDays: 30,
      instructions:
        '1. Contact Medscape Advertising at medscape.com/public/advertising. ' +
        '2. Medical publishing requires editorial review of the site. ' +
        '3. Once approved as a publisher partner, receive a publisher ID. ' +
        '4. Set as MEDSCAPE_PUBLISHER_ID — use in ad slot placements on educational pages.',
      notes:
        'Medical advertising networks require compliance review. ' +
        'Higher CPM than general display — medical audience is high value.',
    },
    {
      id: 'doceree',
      name: 'Doceree Medical Advertising Network',
      category: 'medical',
      envVar: 'DOCEREE_PUBLISHER_ID',
      commission: 'CPM-based — $8–20 CPM for specialist physician audiences',
      paymentThreshold: '$50 minimum payout',
      signupUrl: 'https://www.doceree.com/publishers/',
      cookieDays: 30,
      instructions:
        '1. Apply as a publisher at doceree.com/publishers. ' +
        '2. Doceree specializes in HCP (healthcare professional) targeting — ideal for this site. ' +
        '3. Complete the publisher registration and site verification. ' +
        '4. Receive your publisher ID — set as DOCEREE_PUBLISHER_ID.',
      notes:
        'Doceree is built for physician-targeted advertising. ' +
        'Better CPM than general networks for a medical education site.',
    },
    {
      id: 'medical-conference-tickets',
      name: 'Medical Conference Ticket Affiliate',
      category: 'medical',
      envVar: 'CONF_AFFILIATE_CODE',
      commission: '5–10% of ticket value, or flat $25–75 per registration',
      paymentThreshold: '$50 minimum',
      signupUrl: 'https://www.orthoconference.com',
      cookieDays: 30,
      instructions:
        '1. Contact AAOS, AOSSM, or regional orthopedic conference organizers directly. ' +
        '2. Ask about affiliate or media partner arrangements. ' +
        '3. Some use Eventbrite affiliate — check if the conference is on Eventbrite. ' +
        '4. Set your tracking code as CONF_AFFILIATE_CODE.',
      notes:
        'Conference ticket affiliates require direct outreach to organizers. ' +
        'Best ROI: orthopedic surgery and sports medicine conferences with $500–2000 tickets.',
    },
  ],
  products: [
    {
      id: 'ortho-procedure-reference',
      name: 'Orthobiologic Procedure Reference Card PDF',
      description:
        'Quick-reference laminated card (digital PDF) for orthobiologic procedures — ' +
        'concentration ranges, centrifugation protocols, indications, and contraindications.',
      type: 'pdf-guide',
      suggestedPrice: 14.99,
      status: 'planned',
      envVar: 'GUMROAD_ORTHO_REFERENCE_URL',
      notes:
        'Physician buyers will pay more than consumer products — $14.99 is conservative. ' +
        'Add a bulk-purchase option for clinics buying 10+ copies.',
    },
    {
      id: 'ortho-cme-course',
      name: 'Orthobiologic Fundamentals CME Course',
      description:
        'Self-paced online CME course covering orthobiologic science, clinical applications, ' +
        'and procedural guidance. Target: 2–4 CME credits.',
      type: 'course',
      suggestedPrice: 199,
      status: 'planned',
      envVar: 'STRIPE_ORTHO_CME_PRICE_ID',
      notes:
        'Highest revenue potential on this site. ' +
        'Requires CME accreditation through ACCME or a partner institution. ' +
        'Long lead time but $150–300 per physician CPD market is established.',
    },
  ],
  aiCost: {
    buildSessions: 25,
    avgTokensPerSession: 300_000,
    buildCostUSD: 80,
    monthlyMaintSessions: 3,
    monthlyMaintCostUSD: 10,
    billingNotes:
      'R3F (React Three Fiber) and Framer Motion animations added complexity. ' +
      'Medical content research and accuracy review required extra sessions. ' +
      'No auth or DB — maintenance is primarily visual/content updates.',
  },
  opportunityAudit: [
    'Apply for CME accreditation through ACCME partner — enables the CME course product',
    'Add medical device company sponsorship inquiry form',
    'Add conference speaking lead generation — "Book Dr. X for your conference"',
    'Explore Doceree and Medscape publisher programs for passive ad revenue',
    'Create downloadable procedure reference cards (PDF, $9.99–14.99)',
    'Add email list for orthopedic surgeon audience — newsletter monetization',
    'Add webinar registration capability — recorded webinars become evergreen content',
  ],
}

const LINGUA_LENS: SiteMonetization = {
  siteKey: 'language-lens-elite',
  siteName: 'LinguaLens',
  siteUrl: 'https://language-lens-elite.worker-bee.app',
  siteType: 'language-saas',
  affiliates: [],
  products: [
    {
      id: 'lingualens-free',
      name: 'LinguaLens Free Tier',
      description: 'Free access to core language learning features — limited daily XP and basic vocabulary sets.',
      type: 'subscription',
      suggestedPrice: 0,
      status: 'live',
      notes: 'Free tier drives user acquisition. Convert to Pro via in-app upgrade.',
    },
    {
      id: 'lingualens-pro',
      name: 'LinguaLens Pro Subscription',
      description:
        'Full access to all language learning features — unlimited XP, all vocabulary sets, ' +
        'leaderboard, advanced gamification, and progress analytics.',
      type: 'subscription',
      suggestedPrice: 9.99,
      stripeProductId: 'STRIPE_LINGUALENS_PRO_PRICE_ID',
      status: 'live',
      envVar: 'NEXT_PUBLIC_STRIPE_LINGUALENS_PRO_PRICE',
      notes: 'Primary revenue driver. Monthly recurring revenue.',
    },
    {
      id: 'lingualens-language-threshold',
      name: 'Language Threshold Partnership',
      description:
        'Cross-promotion with language-threshold.com — LinguaLens users get a discount on ' +
        'Language Threshold, and vice versa.',
      type: 'subscription',
      suggestedPrice: 0,
      status: 'planned',
      notes:
        'Revenue share TBD. High strategic value — complementary products targeting same learner audience.',
    },
  ],
  aiCost: {
    buildSessions: 40,
    avgTokensPerSession: 300_000,
    buildCostUSD: 128,
    monthlyMaintSessions: 6,
    monthlyMaintCostUSD: 20,
    billingNotes:
      'Highest build cost in the portfolio. TanStack Start, complex gamification system ' +
      '(XP tiers, rank tiers, leaderboards), Stripe billing, and Cloudflare Workers KV ' +
      'for real-time features all contributed. Monthly maintenance is highest due to ' +
      'active feature development and content expansion.',
  },
  opportunityAudit: [
    'Launch enterprise/school district licensing tier ($199–499/mo per institution)',
    'Add language learning influencer affiliate program — YouTubers and language bloggers',
    'Complete Language Threshold cross-promotion flow with shared referral tracking',
    'Add annual subscription option at 2 months free (reduces churn)',
    'Add family plan tier (2–5 accounts, $16.99/mo)',
    'Build public API tier for language learning apps wanting vocabulary data',
    'Add affiliate program for language teachers who refer students',
  ],
}

const TOBY_ANDERTON_MD: SiteMonetization = {
  siteKey: 'tobyandertonmd',
  siteName: 'Toby Anderton MD',
  siteUrl: 'https://tobyandertonmd.vercel.app',
  siteType: 'marketing',
  affiliates: [],
  products: [],
  aiCost: {
    buildSessions: 8,
    avgTokensPerSession: 300_000,
    buildCostUSD: 26,
    monthlyMaintSessions: 1,
    monthlyMaintCostUSD: 4,
    billingNotes:
      'Simple marketing site — no auth, no DB, no tests. ' +
      'Content in src/components. Maintenance is content updates only.',
  },
  opportunityAudit: [
    'Add speaking engagement inquiry form with calendar integration',
    'Add patient referral intake form with Resend email notification',
    'Add press/media kit download (PDF) — builds credibility for conference bookings',
    'Connect to Orthobiologic Pathways for cross-promotion',
    'Add testimonials from patients and colleagues (with permission)',
    'Add newsletter signup for medical content — small but engaged physician audience',
  ],
}

const MANAGE_WORKER_BEE: SiteMonetization = {
  siteKey: 'manage-worker-bee',
  siteName: 'Manage Worker Bee',
  siteUrl: 'https://manage.worker-bee.app',
  siteType: 'management',
  affiliates: [],
  products: [
    {
      id: 'mwb-agency-retainer-starter',
      name: 'Agency Retainer — Starter',
      description:
        'Monthly retainer for 1 managed client site — includes hosting (Vercel), ' +
        'content updates (2/mo), monitoring, and support.',
      type: 'subscription',
      suggestedPrice: 500,
      status: 'live',
      envVar: 'STRIPE_RETAINER_STARTER_PRICE_ID',
      notes: 'Base tier. Covers Vercel cost + 3–4h labor/mo at sustainable rate.',
    },
    {
      id: 'mwb-agency-retainer-growth',
      name: 'Agency Retainer — Growth',
      description:
        'Monthly retainer for 1 managed site — includes all Starter features plus ' +
        '4 content updates/mo, SEO reporting, and affiliate optimization.',
      type: 'subscription',
      suggestedPrice: 1000,
      status: 'planned',
      envVar: 'STRIPE_RETAINER_GROWTH_PRICE_ID',
      notes: 'Mid tier. Adds SEO and affiliate optimization value.',
    },
    {
      id: 'mwb-agency-retainer-pro',
      name: 'Agency Retainer — Pro',
      description:
        'Monthly retainer for 1 managed site — full-service including unlimited content updates, ' +
        'A/B testing, advanced analytics, and priority development.',
      type: 'subscription',
      suggestedPrice: 2000,
      status: 'planned',
      envVar: 'STRIPE_RETAINER_PRO_PRICE_ID',
      notes: 'Top tier. Positions worker-bee.app as a premium managed service.',
    },
    {
      id: 'mwb-ai-cost-passthrough',
      name: 'AI Build Cost Pass-Through',
      description:
        'Invoice line item for Claude AI session costs attributed to a client site — ' +
        'tracked per session in ai_cost_log table.',
      type: 'subscription',
      suggestedPrice: 0,
      status: 'live',
      notes: 'Not a product — a billing line item. Pass through at cost or add 20% margin.',
    },
    {
      id: 'mwb-custom-dev-hourly',
      name: 'Custom Development (Hourly)',
      description: 'Custom feature development billed hourly for client sites beyond retainer scope.',
      type: 'subscription',
      suggestedPrice: 150,
      status: 'live',
      notes: '$150/hr. Track hours in the ai_cost_log or a separate time tracking tool.',
    },
  ],
  aiCost: {
    buildSessions: 0,
    avgTokensPerSession: 0,
    buildCostUSD: 0,
    monthlyMaintSessions: 0,
    monthlyMaintCostUSD: 0,
    billingNotes:
      'Internal tool — AI costs are amortized across all client site billing. ' +
      'Do not bill this site separately; track costs via ai_cost_log with site_id = manage-worker-bee UUID.',
  },
  opportunityAudit: [
    'Build white-label reseller offering — other agencies pay for worker-bee.app access',
    'Add client portal upgrade path — clients see their own site stats, affiliate earnings, and invoices',
    'Add automated monthly report generation (Resend email with PDF summary)',
    'Create public pricing page for agency services',
    'Add referral program for existing clients who bring new clients',
    'Track and display total AI savings vs traditional agency hourly rate on marketing page',
  ],
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const SITE_MONETIZATION: SiteMonetization[] = [
  CLIMB_IDAHO,
  CLIMB_BRASIL,
  CLIMB_FRANCE,
  CLIMB_SPAIN,
  CLIMB_UTAH,
  CLIMB_KALYMNOS,
  JRS_AUTO_REPAIR,
  SILVER_CREEK_LOGISTICS,
  ORTHOBIOLOGIC_PATHWAYS,
  LINGUA_LENS,
  TOBY_ANDERTON_MD,
  MANAGE_WORKER_BEE,
]

export function getSiteMonetization(siteKey: string): SiteMonetization | undefined {
  return SITE_MONETIZATION.find(s => s.siteKey === siteKey)
}

export default SITE_MONETIZATION
