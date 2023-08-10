import * as sst from "sst/constructs";
import { API } from "./main";

export default function main(app: sst.App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs18.x",
  });

  app.stack(API);
}
