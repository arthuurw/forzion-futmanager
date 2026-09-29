// @vitest-environment jsdom
import { downloadSave } from "./download";
import { captureDownloads, resetAll, seededGame } from "./test-utils";

beforeEach(resetAll);
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("exportar (correcoes-validacao)", () => {
  test("revoga a url depois do clique", () => {
    // C66 (AC 62): revoking right after click() can cancel the download, so it waits for a timer.
    vi.useFakeTimers();
    const files = captureDownloads();
    downloadSave(seededGame(3));
    expect(files).toHaveLength(1);
    const url = vi.mocked(URL.createObjectURL).mock.results[0]!.value as string;
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(0);
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
