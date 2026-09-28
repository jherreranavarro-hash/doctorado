export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-peligro text-sm">
      {message}
    </p>
  );
}
