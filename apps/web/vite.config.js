export default {
  server: {
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://localhost:3001",
      },
    },
  },
};
