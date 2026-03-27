/** @type {import('next').NextConfig} */
const csp = [
	"default-src 'self'",
	`script-src 'self' ${process.env.NODE_ENV === 'production' ? "" : "'unsafe-eval'"} 'unsafe-inline'`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"media-src 'self' data: blob:",
	"frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
	"connect-src 'self'",
	"worker-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
	{ key: 'X-Frame-Options', value: 'DENY' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-DNS-Prefetch-Control', value: 'on' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
	{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
	{ key: 'Content-Security-Policy', value: csp },
	{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
	{ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
	{ key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
];

const nextConfig = {
	output: 'standalone',
	compress: true,
	async headers() {
		return [
			{
				source: '/:path*',
				headers: process.env.NODE_ENV === 'development' 
					? securityHeaders.filter(h => h.key !== 'Strict-Transport-Security')
					: securityHeaders,
			},
			{
				source: '/:path*.(svg|png|jpg|jpeg|gif|ico|webp|woff2|ttf)',
				headers: [
					{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
				],
			},
		];
	},
};

export default nextConfig;
