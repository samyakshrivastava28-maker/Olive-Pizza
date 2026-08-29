import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  schemaMarkup?: object | object[];
  image?: string;
  type?: string;
  noIndex?: boolean;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const DEFAULT_TITLE = 'Olive Pizza — Fresh Artisanal Pizzas in Rajnandgaon & Durg';
const DEFAULT_DESCRIPTION = 'Order handcrafted artisanal pizzas, garlic bread, combos & sides from Olive Pizza. Hot & fresh contactless delivery to your door across Rajnandgaon and Durg.';
const BASE_URL = 'https://olivepizza.in';
const DEFAULT_IMAGE = 'https://res.cloudinary.com/olive-pizza/image/upload/v1700000000/brand/og-banner.jpg';

export default function SEO({
  title,
  description,
  canonicalUrl,
  schemaMarkup,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  breadcrumbs
}: SEOProps) {
  const fullTitle = title ? `${title} | Olive Pizza` : DEFAULT_TITLE;
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const url = canonicalUrl ? `${BASE_URL}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}` : BASE_URL;

  // Restaurant Schema
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    'name': 'Olive Pizza',
    'image': image,
    'url': BASE_URL,
    'telephone': '+91 91799 44445',
    'priceRange': '₹₹',
    'servesCuisine': ['Pizza', 'Italian', 'Fast Food'],
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Dongargaon Rd, near Saraswati school',
      'addressLocality': 'Rajnandgaon',
      'addressRegion': 'Chhattisgarh',
      'postalCode': '491441',
      'addressCountry': 'IN'
    }
  };

  // WebPage Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': fullTitle,
    'description': metaDescription,
    'url': url,
    'publisher': {
      '@type': 'Organization',
      'name': 'Olive Pizza',
      'url': BASE_URL
    }
  };

  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'name': crumb.name,
          'item': `${BASE_URL}${crumb.url.startsWith('/') ? '' : '/'}${crumb.url}`
        }))
      }
    : null;

  const schemas: any[] = [orgSchema, webPageSchema];
  if (breadcrumbSchema) schemas.push(breadcrumbSchema);
  if (schemaMarkup) {
    if (Array.isArray(schemaMarkup)) {
      schemas.push(...schemaMarkup);
    } else {
      schemas.push(schemaMarkup);
    }
  }

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Olive Pizza" />

      {/* Twitter / X */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(schemas)}</script>
    </Helmet>
  );
}
