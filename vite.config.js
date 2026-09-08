import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins:[react()],
 server:{host:'127.0.0.1',port:5173,open:false},
 build:{rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules')){if(id.includes('supabase'))return 'supabase';if(id.includes('recharts')||id.includes('d3-'))return 'charts';if(id.includes('react-query')||id.includes('query-core'))return 'query';}}}}}
});
