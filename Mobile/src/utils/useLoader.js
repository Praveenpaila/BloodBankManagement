import { useState, useEffect } from "react";
import { Alert } from "react-native";

export function useLoader(ctx, loader, deps = []) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then(() => {
        if (active) setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setLoading(false);
          Alert.alert("Load failed", err.message);
        }
      });
    return () => {
      active = false;
    };
  }, [ctx.api, ...deps]);

  return loading;
}
