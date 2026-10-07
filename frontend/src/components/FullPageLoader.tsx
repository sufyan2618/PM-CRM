type FullPageLoaderProps = {
  message?: string;
};

export function FullPageLoader({ message = "Loading your account..." }: FullPageLoaderProps) {
  return (
    <div className="loader-screen" role="status" aria-live="polite">
      <span className="loader-spinner" />
      <p>{message}</p>
    </div>
  );
}
