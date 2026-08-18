import { MockComputeProvider } from "./mock.mjs";
import { LocalComputeProvider } from "./local.mjs";
import { ColabComputeProvider } from "./colab.mjs";

export function createComputeProvider(kind, manager) {
  switch (kind) {
    case "local":
      return new LocalComputeProvider(manager);
    case "colab":
      return new ColabComputeProvider(manager);
    case "mock":
      return new MockComputeProvider(manager);
    default:
      console.warn(`[compute] Unknown COMPUTE_PROVIDER "${kind}" — falling back to mock. Set COMPUTE_PROVIDER=colab for production.`);
      return new MockComputeProvider(manager);
  }
}
