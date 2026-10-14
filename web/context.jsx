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
