const { resolve } = require('path');

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  build: {
    rollupOptions: {
      input: {
        step1: resolve(__dirname, 'step01/index.html'),
        step2: resolve(__dirname, 'step02/index.html'),
        step3: resolve(__dirname, 'step03/index.html'),
        step4: resolve(__dirname, 'step04/index.html'),
        step5: resolve(__dirname, 'step05/index.html'),
        step6: resolve(__dirname, 'step06/index.html'),
        step7: resolve(__dirname, 'step07/index.html'),
        step8: resolve(__dirname, 'step08/index.html'),
        step9: resolve(__dirname, 'step09/index.html'),
        step10: resolve(__dirname, 'step10/index.html'),
        step11: resolve(__dirname, 'step11/index.html'),
        step12: resolve(__dirname, 'step12/index.html'),
        step13: resolve(__dirname, 'step13/index.html'),
        step14: resolve(__dirname, 'step14/index.html'),
        step15: resolve(__dirname, 'step15/index.html'),
        step16: resolve(__dirname, 'step16/index.html'),
      },
    },
    target: 'esnext',
  },
};
