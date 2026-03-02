import { generateAlignBridge } from "./alignEngine.js";
import { generateSpectralBridge } from "./spectralEngine.js";
import { generateMachineBridge } from "./machineEngine.js";

export const engineMap = {
  ALIGN: generateAlignBridge,
  SPECTRAL: generateSpectralBridge,
  MACHINE: generateMachineBridge,
};
