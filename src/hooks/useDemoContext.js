import { useContext } from 'react';
import { DemoContext } from '../context/DemoContext.jsx';

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoContext must be used within <DemoProvider>');
  return ctx;
}
