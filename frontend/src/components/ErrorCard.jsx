import { AlertCircle } from "lucide-react";

function ErrorCard({ message, onRetry }) {
  return (
    <div className="error-card">
      <span className="error-card-icon">
        <AlertCircle size={32} strokeWidth={1.5} />
      </span>
      <p className="error-card-message">{message || "Something went wrong."}</p>
      {onRetry && (
        <button type="button" className="error-card-retry" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorCard;
