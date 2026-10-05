import "dotenv/config";
import { DEMO_ACTORS, demoToken } from "../src/auth";
for (const profile of Object.keys(DEMO_ACTORS)) {
  const result = demoToken(profile);
  console.log(profile, JSON.stringify(result));
}
