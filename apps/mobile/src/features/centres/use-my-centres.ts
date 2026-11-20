import { useCallback, useEffect, useState } from "react";

import { listMyCentres, type CentreSummary } from "./repository";

type State =
  { status: "loading" } | { status: "error" } | { status: "ready"; centres: CentreSummary[] };

export function useMyCentres() {
  const [state, setState] = useState<State>({ status: "loading" });

  const fetchCentres = useCallback(() => {
    listMyCentres()
      .then((centres) => setState({ status: "ready", centres }))
      .catch(() => setState({ status: "error" }));
  }, []);

  // Initial load: the state already starts as "loading".
  useEffect(fetchCentres, [fetchCentres]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    fetchCentres();
  }, [fetchCentres]);

  return { state, reload };
}
