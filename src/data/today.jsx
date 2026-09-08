export const localToday = () => {
  const e = new Date();
  return new Date(e.getTime() - e.getTimezoneOffset() * 6e4)
    .toISOString()
    .slice(0, 10);
};
export function useLocalToday() {
  return localToday();
}
export const useToday = useLocalToday;
