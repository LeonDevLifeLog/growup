import { createContext, useContext, useEffect, useState } from "react";
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function useResource(path, enabled = true) {
  const { call, refresh, token } = useApp();
  const [state, setState] = useState({
    data: null,
    loading: !!enabled,
    error: "",
  });
  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ data: null, loading: false, error: "" });
      return;
    }
    setState({ data: null, loading: true, error: "" });
    call(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({ data: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [path, enabled, refresh, token, call]);
  return state;
}

/** One in-flight request per form; the error belongs to the form that sent it. */
export function useMutation() {
  const { call, bump, notify } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(path, { method = "POST", body, success = "已保存" } = {}) {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const result = await call(path, { method, body });
      bump();
      if (success) notify(success);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

/** Ask before a dismissed dialog throws away what someone has typed. */
export function useDirty(dirty) {
  const { setDirty } = useApp();
  useEffect(() => {
    setDirty?.(!!dirty);
    return () => setDirty?.(false);
  }, [dirty, setDirty]);
}
