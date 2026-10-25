import "./security.mjs";
import { assertBuildBoundaries } from "./lib/build-boundaries.mjs";

assertBuildBoundaries();
console.log("Offline build input boundaries passed.");
