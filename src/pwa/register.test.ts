import { registerServiceWorker } from "./register";

const container = (register: () => Promise<unknown>) => ({ serviceWorker: { register } as unknown as ServiceWorkerContainer });

describe("registro (offline-instalar)", () => {
  test("registro do service worker", async () => {
    // C3 (AC 3, L-005, L-031): production with a worker registers once; nothing else registers or fails.
    const register = vi.fn(() => Promise.resolve({}));
    await registerServiceWorker({ production: true, navigator: container(register) });
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("./sw.js", { scope: "./" });

    // The same navigator outside production: no call.
    const notProd = vi.fn(() => Promise.resolve({}));
    await registerServiceWorker({ production: false, navigator: container(notProd) });
    expect(notProd).not.toHaveBeenCalled();

    await expect(registerServiceWorker({ production: true, navigator: {} })).resolves.toBeUndefined();

    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = vi.fn(() => Promise.reject(new Error("SecurityError")));
    await expect(registerServiceWorker({ production: true, navigator: container(failing) })).resolves.toBeUndefined();
    expect(failing).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
