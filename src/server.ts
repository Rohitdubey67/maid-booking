import { createApp } from "./api/app.js";
import { createServices } from "./setup.js";
import { addSampleMaids } from "./sampleMaids.js";

const port = Number(process.env.PORT ?? 3000);
const UNPAID_CHECK_INTERVAL_MS = 60_000;

const services = createServices();

if (process.env.SAMPLE_DATA !== "false") {
  const maids = await addSampleMaids(services.maidService);
  console.log(`Added ${maids.length} sample maids: ${maids.map((maid) => `${maid.name} (${maid.id})`).join(", ")}`);
}

setInterval(() => {
  services.expiryService.expireUnpaid().catch((error: unknown) => {
    console.error("Clearing unpaid visits failed", error);
  });
}, UNPAID_CHECK_INTERVAL_MS).unref();

createApp(services).listen(port, () => {
  console.log(`Maid booking service listening on port ${port}`);
});
