import { SSTConfig } from "sst";

export default {
  config(_input) {
    return {
      name: "gamermatch",
      region: "eu-west-1",
    };
  },
  async stacks(app) {
    const appStacks = await import("./stacks");
    appStacks.default(app);
  },
} satisfies SSTConfig;
