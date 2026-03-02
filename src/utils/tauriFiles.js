import { arrayBufferToBase64 } from "./base64.js";

export function getTauriInvoke() {
  const ownInvoke = window.__TAURI__?.core?.invoke;
  if (typeof ownInvoke === "function") return ownInvoke;
  try {
    const parentInvoke = window.parent?.__TAURI__?.core?.invoke;
    if (typeof parentInvoke === "function") return parentInvoke;
  } catch {}
  return null;
}

export async function dialogOpenFile({ defaultDir = "", filters = [] } = {}) {
  const invoke = getTauriInvoke();
  if (!invoke) return null;
  try {
    return await invoke("dialog_open_file", {
      defaultDir: String(defaultDir || ""),
      filters,
    });
  } catch {
    return null;
  }
}

export async function dialogSaveFile({ defaultDir = "", suggestedName = "render.wav", filters = [] } = {}) {
  const invoke = getTauriInvoke();
  if (!invoke) return null;
  try {
    return await invoke("dialog_save_file", {
      defaultDir: String(defaultDir || ""),
      suggestedName,
      filters,
    });
  } catch {
    return null;
  }
}

export async function readFileBase64(path) {
  const invoke = getTauriInvoke();
  if (!invoke || !path) return null;
  try {
    return await invoke("read_file_base64", { path: String(path) });
  } catch {
    return null;
  }
}

export async function saveBlobToPath(blob, path) {
  const invoke = getTauriInvoke();
  if (!invoke || !blob || !path) return false;
  try {
    const dataBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return Boolean(await invoke("save_blob_to_path", { dataBase64, path: String(path) }));
  } catch {
    return false;
  }
}

export async function saveBlobWithDialog(blob, { defaultDir = "", suggestedName = "render.wav", filters = [] } = {}) {
  const savePath = await dialogSaveFile({ defaultDir, suggestedName, filters });
  if (!savePath) return "cancelled";
  const ok = await saveBlobToPath(blob, savePath);
  return ok ? "saved" : "cancelled";
}
