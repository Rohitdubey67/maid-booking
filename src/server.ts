import { createApp } from "./api/app.js";

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`Maid booking service listening on port ${port}`);
});
