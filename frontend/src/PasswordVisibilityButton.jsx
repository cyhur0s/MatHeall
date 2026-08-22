export default function PasswordVisibilityButton({ visible, onToggle }) {
  return (
    <button
      type="button"
      className="password-visibility-btn"
      onClick={onToggle}
      aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
      aria-pressed={visible}
      title={visible ? "Sembunyikan password" : "Tampilkan password"}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {visible ? (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
            <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.2 0 8.5 4.4 9.4 6a2 2 0 0 1 0 2c-.4.7-1.3 1.9-2.6 3" />
            <path d="M6.6 6.6C4.5 8 3.2 9.8 2.6 11a2 2 0 0 0 0 2c.9 1.6 4.2 6 9.4 6 1.1 0 2.1-.2 3-.5" />
          </>
        ) : (
          <>
            <path d="M2.6 11a2 2 0 0 0 0 2c.9 1.6 4.2 6 9.4 6s8.5-4.4 9.4-6a2 2 0 0 0 0-2C20.5 9.4 17.2 5 12 5S3.5 9.4 2.6 11Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}
