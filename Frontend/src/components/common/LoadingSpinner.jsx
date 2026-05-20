export const SmallSpinner = () => (
  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
);

const LoadingSpinner = () => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-white/80">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C0392B] border-r-transparent" />
  </div>
);

export default LoadingSpinner;
