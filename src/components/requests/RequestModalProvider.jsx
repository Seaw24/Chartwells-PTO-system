import { createContext, useCallback, useContext, useState } from 'react';
import Modal from '../ui/Modal';
import RequestForm from './RequestForm';

const RequestModalContext = createContext(null);

// Lets any screen open the "New Request" modal, optionally pre-filled (e.g. from a calendar day).
export function RequestModalProvider({ children }) {
  const [state, setState] = useState({ open: false, prefill: {} });

  const openRequest = useCallback((prefill = {}) => setState({ open: true, prefill }), []);
  const close = useCallback(() => setState({ open: false, prefill: {} }), []);

  return (
    <RequestModalContext.Provider value={{ openRequest }}>
      {children}
      <Modal open={state.open} onClose={close} title="Request time off" size="lg">
        <RequestForm prefill={state.prefill} onSubmitted={close} onCancel={close} />
      </Modal>
    </RequestModalContext.Provider>
  );
}

export function useRequestModal() {
  const ctx = useContext(RequestModalContext);
  if (!ctx) throw new Error('useRequestModal must be used within <RequestModalProvider>');
  return ctx;
}
