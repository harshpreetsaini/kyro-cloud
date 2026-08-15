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
    default:
      return new MockComputeProvider(manager);
  }
}
