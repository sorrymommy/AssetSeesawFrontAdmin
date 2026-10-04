import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// SPA로 정적 빌드 → nginx가 서빙 (모든 경로를 index.html로 fallback)
		adapter: adapter({ fallback: 'index.html' })
	}
};

export default config;
