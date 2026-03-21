/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Security #47: remove unsafe-eval in production
const scriptSrc = isProd
	? "script-src 'self' 'unsafe-inline'"
	: "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const csp = [
	"default-src 'self'",
	scriptSrc,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"media-src 'self' data: blob:",
	"frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
	"connect-src 'self'",
	"worker-src blob:",
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
	// Security #48: use credentialless instead of require-corp to allow youtube/vimeo/drive embeds
	{ key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
];

const nextConfig = {
	output: 'standalone',
	compress: true,
	async headers() {
		return [
			{
				source: '/:path*',
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
