type AlertProps = {
  tone: "error" | "success";
  message: string;
};

export function Alert({ tone, message }: AlertProps) {
  return (
    <p className={tone === "error" ? "alert alert-error" : "alert alert-success"} role="alert">
      {message}
    </p>
  );
}
