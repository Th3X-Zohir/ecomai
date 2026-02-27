const app = require('./src/app');
const { port } = require('./src/config');

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ecomai API listening on :${port}`);
});
