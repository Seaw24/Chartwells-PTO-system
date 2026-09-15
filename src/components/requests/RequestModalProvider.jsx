import React from "react";
import { Modal } from "../ui/Modal.jsx";
import { RequestForm } from "./RequestForm.jsx";
import { WellnessRequestForm } from "./WellnessRequestForm.jsx";
export const RequestModalContext = React.createContext(null);
export function RequestModalProvider({ children: children }) {
  const [t, n] = React.useState({
      open: !1,
      prefill: {},
    }),
    r = React.useCallback(
      (i = {}) =>
        n({
          open: !0,
          prefill: i,
        }),
      [],
    ),
    s = React.useCallback(
      () =>
        n({
          open: !1,
          prefill: {},
        }),
      [],
    ),
    [wellnessOpen, setWellnessOpen] = React.useState(!1),
    openWellnessRequest = React.useCallback(() => setWellnessOpen(!0), []),
    closeWellness = React.useCallback(() => setWellnessOpen(!1), []);
  return (
    <RequestModalContext.Provider
      value={{
        openRequest: r,
        openWellnessRequest: openWellnessRequest,
      }}
    >
      {children}
      <Modal open={t.open} onClose={s} title="Request time off" size="lg">
        <RequestForm prefill={t.prefill} onSubmitted={s} onCancel={s} />
      </Modal>
      <Modal
        open={wellnessOpen}
        onClose={closeWellness}
        title="Request wellness day off"
        size="md"
      >
        <WellnessRequestForm
          onSubmitted={closeWellness}
          onCancel={closeWellness}
        />
      </Modal>
    </RequestModalContext.Provider>
  );
}
export function useRequestModal() {
  const e = React.useContext(RequestModalContext);
  if (!e)
    throw new Error(
      "useRequestModal must be used within <RequestModalProvider>",
    );
  return e;
}
